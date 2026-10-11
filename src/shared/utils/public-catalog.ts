import { NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PageMetaDto } from '../dtos/pageMeta.dto';
import { ResponsePaginationDto } from '../dtos/pagination.dto';
import { PublicCatalogItem, PublicCatalogParamsDto } from '../dtos/public-catalog.dto';

/**
 * Catálogo PÚBLICO de un hotel (productos, servicios): listado y ficha.
 *
 * - Solo los del hotel del host (`organizationalId`, lo pasa el controller desde
 *   `TenantContext`): nunca mezcla organizaciones.
 * - Lista blanca de campos: nada de precio de compra ni stock.
 * - Paginación en dos pasos (ids primero, luego el join a imágenes): con
 *   `leftJoinAndSelect(images)` + LIMIT se cortan filas del JOIN y no ítems
 *   (mismo problema que ya tuvo el listado público de hospedajes).
 */
type CatalogEntity = {
  code?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  priceSale: number;
  categoryType?: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  taxeType?: { percentage: number } | null;
  images?: { imageUrl: string; position?: number }[];
};

export interface PublicCatalogSource<E extends CatalogEntity> {
  repository: Repository<E>;
  alias: string;
  idColumn: string;
  idOf: (e: E) => number;
  /** Filtros propios del tipo (p. ej. solo activos). */
  applyVisibility: (qb: SelectQueryBuilder<E>, alias: string) => void;
  notFoundMessage: string;
}

function base<E extends CatalogEntity>(
  src: PublicCatalogSource<E>,
  organizationalId: string,
): SelectQueryBuilder<E> {
  const qb = src.repository
    .createQueryBuilder(src.alias)
    .where(`${src.alias}.organizationalId = :organizationalId`, { organizationalId })
    .andWhere(`${src.alias}.deletedAt IS NULL`);
  src.applyVisibility(qb, src.alias);
  return qb;
}

function withRelations<E extends CatalogEntity>(
  qb: SelectQueryBuilder<E>,
  alias: string,
): SelectQueryBuilder<E> {
  return qb
    .leftJoinAndSelect(`${alias}.categoryType`, 'categoryType')
    .leftJoinAndSelect(`${alias}.taxeType`, 'taxeType')
    .leftJoinAndSelect(`${alias}.images`, 'images')
    .addOrderBy('images.position', 'ASC');
}

export function toPublicCatalogItem<E extends CatalogEntity>(
  e: E,
  id: number,
): PublicCatalogItem {
  return {
    id,
    code: e.code ?? null,
    name: e.name,
    description: e.description ?? null,
    priceSale: Number(e.priceSale ?? 0),
    taxPercentage:
      e.taxeType?.percentage != null ? Number(e.taxeType.percentage) : null,
    categoryType: e.categoryType
      ? {
          categoryTypeId: e.categoryType.categoryTypeId,
          code: e.categoryType.code,
          name: e.categoryType.name,
        }
      : null,
    images: (e.images ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((img) => ({ imageUrl: img.imageUrl })),
  };
}

export async function listPublicCatalog<E extends CatalogEntity>(
  src: PublicCatalogSource<E>,
  organizationalId: string,
  params: PublicCatalogParamsDto,
): Promise<ResponsePaginationDto<PublicCatalogItem>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 12;
  const a = src.alias;

  const idQuery = base(src, organizationalId)
    .select(`${a}.${src.idColumn}`, 'id')
    .addSelect(`"${a}"."name"->>'es'`, 'name_sort')
    .orderBy('name_sort', 'ASC')
    .addOrderBy(`${a}.${src.idColumn}`, 'ASC');
  if (params.search?.trim()) {
    idQuery.andWhere(`LOWER("${a}"."name"->>'es') LIKE LOWER(:search)`, {
      search: `%${params.search.trim()}%`,
    });
  }
  if (params.categoryTypeId) {
    idQuery.andWhere(`${a}.categoryTypeId = :categoryTypeId`, {
      categoryTypeId: params.categoryTypeId,
    });
  }

  const itemCount = await idQuery.clone().getCount();
  const pageOptionsDto = { page, perPage } as never;
  const ids = (
    await idQuery
      .clone()
      .offset((page - 1) * perPage)
      .limit(perPage)
      .getRawMany<{ id: number }>()
  ).map((r) => Number(r.id));

  if (!ids.length) {
    return new ResponsePaginationDto([], new PageMetaDto({ itemCount, pageOptionsDto }));
  }

  const entities = await withRelations(
    src.repository.createQueryBuilder(a).where(`${a}.${src.idColumn} IN (:...ids)`, { ids }),
    a,
  ).getMany();
  const byId = new Map(entities.map((e) => [src.idOf(e), e]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((e): e is E => !!e)
    .map((e) => toPublicCatalogItem(e, src.idOf(e)));

  return new ResponsePaginationDto(items, new PageMetaDto({ itemCount, pageOptionsDto }));
}

export async function findPublicCatalogItem<E extends CatalogEntity>(
  src: PublicCatalogSource<E>,
  organizationalId: string,
  id: number,
): Promise<PublicCatalogItem> {
  const e = await withRelations(
    base(src, organizationalId).andWhere(`${src.alias}.${src.idColumn} = :id`, { id }),
    src.alias,
  ).getOne();
  // De otro hotel, inactivo o borrado: no existe para este sitio.
  if (!e) throw new NotFoundException(src.notFoundMessage);
  return toPublicCatalogItem(e, src.idOf(e));
}
