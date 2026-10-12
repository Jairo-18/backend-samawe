import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context.service';

/**
 * Rutas PÚBLICAS (sin guard de sesión) en el host del panel: si traen un token
 * válido con `orgId`, la petición opera en ese hotel.
 *
 * Las rutas con guard ya lo resuelven en la estrategia JWT. Pero el panel
 * también LEE por rutas públicas, las mismas que usa la web de Samawe:
 * beneficios, valores corporativos, medios, legales, reseñas. Sin esto, el
 * admin de otro hotel recibía los datos del host (Samawe) o un 404 de
 * `@OwnedBy` al pedir los de su hotel.
 *
 * - Solo en el host del panel (`isPanel`); en la API de cada hotel manda el host.
 * - Solo si no hay `req.user` (ruta sin guard) y el token se verifica con la
 *   firma del servidor. Un token inválido o vencido se ignora: la ruta sigue
 *   siendo pública y responde lo del host.
 * - Solo cambia QUÉ datos públicos se leen; no da permisos (para eso están los
 *   guards de cada ruta).
 *
 * Va ANTES de `TenantParamInterceptor` y `OwnershipInterceptor`.
 */
@Injectable()
export class PanelSessionInterceptor implements NestInterceptor {
  private readonly _jwt = new JwtService({});

  constructor(
    private readonly _tenant: TenantContext,
    private readonly _config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    if (req?.user || !this._tenant.tenant?.isPanel) return next.handle();

    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return next.handle();

    try {
      const payload = this._jwt.verify<{ orgId?: string | null }>(token, {
        secret: this._config.get<string>('jwt.secret'),
      });
      if (payload?.orgId && payload.orgId !== this._tenant.organizationalId) {
        this._tenant.actAs(payload.orgId);
      }
    } catch {
      // Token inválido o vencido: la ruta es pública, sigue con el host.
    }
    return next.handle();
  }
}
