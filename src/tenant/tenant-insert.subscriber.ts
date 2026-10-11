import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityMetadata,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { TenantContext } from './tenant-context.service';
import { TtlCache } from '../shared/utils/ttl-cache';

/** Tablas con `organizationalId` que NO son datos de un hotel. */
const SKIP_TABLES = new Set(['Organizational', 'organization_domains']);

/** Roles que pueden aparecer en datos de cualquier hotel (empleado de una factura…). */
const PLATFORM_ROLE_CODES = ['SUPERADMIN', 'PLATFORM_ADMIN'];

const hasOrgColumn = (m: EntityMetadata) =>
  m.columns.some((c) => c.databaseName === 'organizationalId');

/**
 * Dos garantías para toda escritura hecha DENTRO de una petición:
 *
 * 1. **Inserciones sin hotel -> el de la petición.** Varios `create` no lo
 *    asignaban (menús, imágenes de hospedajes…) y esas filas quedaban sin
 *    hotel: invisibles para los listados filtrados, visibles para los que no.
 *    Si la fila ya trae hotel no se toca (un administrador de plataforma crea
 *    para el hotel en el que actúa; el `organizationalId` del cliente ya lo
 *    reemplazó `TenantParamInterceptor`).
 *
 * 2. **Relaciones de otro hotel -> 404.** Cada relación hacia una tabla de
 *    hotel (el producto de un renglón, el cliente de una factura, el
 *    ingrediente de una receta…) tiene que ser del hotel de la petición. Así
 *    un id ajeno en el BODY no se cuela por ningún servicio, lo valide este o
 *    no. Excepciones: filas sin hotel (datos viejos, ver la migración de
 *    backfill) y usuarios de plataforma (superadmin como empleado).
 *
 * Fuera de una petición (crons, scripts, migraciones) no hay hotel y no hace
 * nada: ahí el código lo fija con `runAs`.
 */
@Injectable()
export class TenantInsertSubscriber implements EntitySubscriberInterface {
  private readonly _logger = new Logger(TenantInsertSubscriber.name);
  /** `${tabla}:${id}` -> hotel. El hotel de una fila no cambia. */
  private readonly _owners = new TtlCache<{ owner: string | null }>(60_000, 5_000);

  constructor(
    @InjectDataSource() private readonly _dataSource: DataSource,
    private readonly _tenant: TenantContext,
  ) {
    _dataSource.subscribers.push(this);
  }

  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    const orgId = this._applies(event.metadata, event.entity);
    if (!orgId) return;
    this._fillOrganization(event.metadata, event.entity, orgId);
    await this._assertRelations(event.metadata, event.entity, orgId);
  }

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    const orgId = this._applies(event.metadata, event.entity);
    if (!orgId) return;
    await this._assertRelations(event.metadata, event.entity, orgId);
  }

  /** Hotel de la petición si la escritura es de una tabla de hotel. */
  private _applies(metadata: EntityMetadata, entity: unknown): string | undefined {
    if (!entity || typeof entity !== 'object') return undefined;
    if (SKIP_TABLES.has(metadata.tableName) || !hasOrgColumn(metadata)) return undefined;
    return this._tenant.organizationalId;
  }

  private _fillOrganization(metadata: EntityMetadata, entity: any, orgId: string): void {
    const column = metadata.columns.find((c) => c.databaseName === 'organizationalId')!;
    const current = column.getEntityValue(entity) ?? entity.organizationalId;
    if (current) {
      if (current !== orgId) {
        this._logger.warn(`Inserción en ${metadata.tableName} con hotel distinto al de la petición.`);
      }
      return;
    }
    const relation = metadata.relations.find((r) =>
      r.joinColumns.some((jc) => jc.databaseName === 'organizationalId'),
    );
    if (relation && !entity[relation.propertyName]) {
      entity[relation.propertyName] = { organizationalId: orgId };
    }
    // Propiedad `organizationalId` declarada (sola o unida a la relación).
    if (metadata.columns.some((c) => c.propertyName === 'organizationalId')) {
      entity.organizationalId = orgId;
    }
  }

  private async _assertRelations(metadata: EntityMetadata, entity: any, orgId: string): Promise<void> {
    for (const relation of metadata.manyToOneRelations) {
      const target = relation.inverseEntityMetadata;
      if (SKIP_TABLES.has(target.tableName) || !hasOrgColumn(target)) continue;
      const joinColumn = relation.joinColumns[0];
      if (!joinColumn) continue;
      // El id puede venir como objeto de la relación o como columna explícita.
      const value = entity[relation.propertyName];
      let id: unknown =
        value && typeof value === 'object'
          ? joinColumn.referencedColumn?.getEntityValue(value)
          : value;
      if (id === undefined || id === null) {
        const explicit = metadata.columns.find(
          (c) => c.databaseName === joinColumn.databaseName && !c.relationMetadata,
        );
        id = explicit ? entity[explicit.propertyName] : undefined;
      }
      if (id === undefined || id === null || id === '') continue;

      const owner = await this._ownerOf(target, String(id));
      if (owner === undefined || owner === null || owner === orgId) continue;
      this._logger.warn(
        `Escritura en ${metadata.tableName} con ${relation.propertyName} de otro hotel bloqueada.`,
      );
      throw new NotFoundException();
    }
  }

  /** Hotel de la fila (`null` = sin hotel o usuario de plataforma; `undefined` = no existe). */
  private async _ownerOf(target: EntityMetadata, id: string): Promise<string | null | undefined> {
    const key = `${target.tableName}:${id}`;
    const cached = this._owners.get(key);
    if (cached) return cached.owner;
    const pk = target.primaryColumns[0].databaseName;
    const isUser = target.tableName === 'User';
    const rows: Array<{ owner: string | null; role?: string | null }> = await this._dataSource
      .query(
        isUser
          ? `SELECT u."organizationalId" owner, rt.code role FROM "User" u
               LEFT JOIN "RoleType" rt ON rt."roleTypeId" = u."roleTypeId"
              WHERE u."${pk}"::text = $1`
          : `SELECT "organizationalId" owner FROM "${target.tableName}" WHERE "${pk}"::text = $1`,
        [id],
      )
      .catch(() => []);
    if (!rows.length) return undefined;
    const owner = isUser && PLATFORM_ROLE_CODES.includes(rows[0].role ?? '') ? null : rows[0].owner;
    this._owners.set(key, { owner });
    return owner;
  }
}
