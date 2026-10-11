import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context.service';

const FIELD = 'organizationalId';

/**
 * Con sesión, el `organizationalId` que mande el cliente NO se respeta: se
 * sustituye por el de la organización de la sesión, en la query y en el body
 * (también en cada elemento si el body es un arreglo, p. ej. los renglones de
 * una factura).
 *
 * Por qué así: casi todos los DTOs aceptan `organizationalId` y los servicios lo
 * usaban tal cual, así que un admin de un hotel podía listar o CREAR datos en
 * otro con solo cambiar ese campo. El front ya manda la organización de la
 * sesión, así que para el uso normal no cambia nada.
 *
 * Solo REEMPLAZA si el campo viene: agregarlo donde el DTO no lo declara haría
 * fallar la validación (`forbidNonWhitelisted`). Los listados que deben filtrar
 * aunque el cliente no lo mande lo fijan en su controller.
 *
 * Sin sesión (sitio público) no toca nada: ahí el hotel sale del host.
 * Los ids en la RUTA (`/organizational/:id`) no pasan por aquí: los controla
 * cada controller.
 */
@Injectable()
export class TenantParamInterceptor implements NestInterceptor {
  constructor(private readonly _tenant: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const organizationalId = this._tenant.organizationalId;
    if (req?.user && organizationalId) {
      // Express 5: `req.query` es un getter que vuelve a parsear la URL en cada
      // acceso, así que modificar el objeto que devuelve no sirve de nada. Se
      // fija una copia como propiedad PROPIA de la petición, que tapa al getter.
      const query = req.query;
      if (query && Object.prototype.hasOwnProperty.call(query, FIELD)) {
        Object.defineProperty(req, 'query', {
          value: { ...query, [FIELD]: organizationalId },
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (Array.isArray(req.body)) {
        for (const item of req.body) overwrite(item, organizationalId);
      } else {
        overwrite(req.body, organizationalId);
        // `createMany` y similares: { details: [...] }.
        for (const value of Object.values(req.body ?? {})) {
          if (Array.isArray(value)) for (const item of value) overwrite(item, organizationalId);
        }
      }
    }
    return next.handle();
  }
}

function overwrite(target: unknown, organizationalId: string): void {
  if (
    target &&
    typeof target === 'object' &&
    Object.prototype.hasOwnProperty.call(target, FIELD)
  ) {
    (target as Record<string, unknown>)[FIELD] = organizationalId;
  }
}
