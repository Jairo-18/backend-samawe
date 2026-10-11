import { Controller, Get, Header, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExcursionRepository } from '../../shared/repositories/excursion.repository';
import { TenantContext } from '../../tenant/tenant-context.service';
import { PublicCatalogParamsDto } from '../../shared/dtos/public-catalog.dto';
import { Excursion } from '../../shared/entities/excursion.entity';
import {
  findPublicCatalogItem,
  listPublicCatalog,
  PublicCatalogSource,
} from '../../shared/utils/public-catalog';

/**
 * Catálogo público de servicios / excursiones (sin sesión). El hotel sale del
 * host. No se muestran los que están "FUERA DE SERVICIO" (el estado se compara
 * por nombre: los códigos de `StateType` no son estables entre bases).
 */
@Controller('excursion/public')
@ApiTags('Servicios Público')
export class ExcursionPublicController {
  private readonly _source: PublicCatalogSource<Excursion>;

  constructor(
    excursionRepository: ExcursionRepository,
    private readonly _tenant: TenantContext,
  ) {
    this._source = {
      repository: excursionRepository,
      alias: 'excursion',
      idColumn: 'excursionId',
      idOf: (e) => e.excursionId,
      applyVisibility: (qb, a) =>
        qb
          .leftJoin(`${a}.stateType`, 'visibleState')
          .andWhere(
            `(visibleState.stateTypeId IS NULL OR UPPER("visibleState"."name"->>'es') <> 'FUERA DE SERVICIO')`,
          ),
      notFoundMessage: 'Servicio no encontrado',
    };
  }

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Get('list')
  @ApiOperation({ summary: 'Servicios disponibles del hotel del sitio (público)' })
  async list(@Query() params: PublicCatalogParamsDto) {
    return listPublicCatalog(this._source, this._tenant.requireOrganizationalId(), params);
  }

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Get(':id')
  @ApiOperation({ summary: 'Ficha pública de un servicio' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await findPublicCatalogItem(
      this._source,
      this._tenant.requireOrganizationalId(),
      id,
    );
    return { statusCode: HttpStatus.OK, data };
  }
}
