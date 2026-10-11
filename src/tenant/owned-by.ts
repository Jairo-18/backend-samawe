import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { Observable, from, switchMap } from 'rxjs';
import { TenantContext } from './tenant-context.service';

/**
 * Un id de la RUTA y la tabla a la que pertenece.
 *
 * - `entity`: la entidad cuyo registro nombra el parámetro.
 * - `param`: nombre del parámetro (`:id`, `:invoiceId`…).
 * - `column`: propiedad por la que se busca; por defecto la clave primaria.
 * - `via`: relaciones a recorrer hasta una entidad con `organizationalId`,
 *   para las tablas hijas que no lo tienen (ítems legales, respuestas…).
 * - `allowSelf`: el parámetro puede ser el propio usuario de la sesión (un
 *   administrador de plataforma editando su perfil mientras actúa en otro hotel).
 */
export interface OwnedBySpec {
  entity: EntityTarget<ObjectLiteral>;
  param: string;
  column?: string;
  via?: string[];
  allowSelf?: boolean;
}

export const OWNED_BY = 'tenant:owned-by';

/**
 * Declara que los ids de la ruta son de un hotel: si el registro existe y es de
 * OTRO hotel que el de la petición, la respuesta es 404, igual que si no
 * existiera (no se revela que existe). Si no existe, sigue al handler, que
 * responde su propio 404.
 *
 * Se resuelve en `OwnershipInterceptor`, después de los guards: así ve el
 * hotel efectivo de la sesión (el de `actAs` para un administrador de
 * plataforma), no solo el del host.
 */
export const OwnedBy = (...specs: OwnedBySpec[]) => SetMetadata(OWNED_BY, specs);

@Injectable()
export class OwnershipInterceptor implements NestInterceptor {
  private readonly _logger = new Logger(OwnershipInterceptor.name);

  constructor(
    private readonly _reflector: Reflector,
    private readonly _dataSource: DataSource,
    private readonly _tenant: TenantContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const specs = this._reflector.getAllAndOverride<OwnedBySpec[] | undefined>(
      OWNED_BY,
      [context.getHandler(), context.getClass()],
    );
    if (!specs?.length) return next.handle();

    const req = context.switchToHttp().getRequest();
    return from(this._check(specs, req)).pipe(switchMap(() => next.handle()));
  }

  private async _check(specs: OwnedBySpec[], req: any): Promise<void> {
    // Sin hotel no hay a quién comparar: se falla cerrado.
    const orgId = this._tenant.organizationalId;
    if (!orgId) throw new NotFoundException();

    for (const spec of specs) {
      const value = req.params?.[spec.param];
      if (value === undefined || value === null || value === '') {
        // Error de configuración: el decorador nombra un parámetro que la ruta no tiene.
        throw new InternalServerErrorException(
          `OwnedBy: la ruta no tiene el parámetro "${spec.param}".`,
        );
      }
      if (spec.allowSelf && req.user?.userId && String(req.user.userId) === String(value)) {
        continue;
      }
      const owner = await this._ownerOf(spec, value);
      if (owner === undefined) continue; // no existe: que responda el handler
      if (owner !== orgId) {
        this._logger.warn(
          `Acceso a registro de otro hotel bloqueado: ${req.method} ${req.originalUrl ?? req.url}`,
        );
        throw new NotFoundException();
      }
    }
  }

  /**
   * `organizationalId` dueño del registro; `null` si la fila no tiene hotel
   * (cuenta como ajena), `undefined` si la fila no existe.
   */
  private async _ownerOf(spec: OwnedBySpec, value: string): Promise<string | null | undefined> {
    const metadata = this._dataSource.getMetadata(spec.entity);
    const column = spec.column ?? metadata.primaryColumns[0].propertyPath;
    const qb = this._dataSource.createQueryBuilder(metadata.target, 'e');
    let alias = 'e';
    let current = metadata;
    (spec.via ?? []).forEach((relation, i) => {
      const next = `p${i}`;
      qb.innerJoin(`${alias}.${relation}`, next);
      current = current.findRelationWithPropertyPath(relation)!.inverseEntityMetadata;
      alias = next;
    });
    if (!current.columns.some((c) => c.databaseName === 'organizationalId')) {
      throw new InternalServerErrorException(
        `OwnedBy: ${current.name} no tiene organizationalId (revisar "via").`,
      );
    }
    try {
      const row = await qb
        .select(`"${alias}"."organizationalId"`, 'owner')
        .where(`e.${column} = :value`, { value })
        .getRawOne<{ owner: string | null }>();
      return row ? row.owner : undefined;
    } catch {
      // Valor que no castea al tipo de la columna (texto en un id numérico,
      // uuid mal formado): no puede ser un registro de nadie.
      throw new NotFoundException();
    }
  }
}
