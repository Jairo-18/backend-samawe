import { Controller, Get, Header, HttpStatus, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductRepository } from '../../shared/repositories/product.repository';
import { TenantContext } from '../../tenant/tenant-context.service';
import { PublicCatalogParamsDto } from '../../shared/dtos/public-catalog.dto';
import { Product } from '../../shared/entities/product.entity';
import {
  findPublicCatalogItem,
  listPublicCatalog,
  PublicCatalogSource,
} from '../../shared/utils/public-catalog';

/**
 * Catálogo público de productos (sin sesión), p. ej. para el sitio de un hotel
 * hecho en otra tecnología. El hotel sale del host; solo productos activos.
 * Se registra ANTES que `ProductController` para que `public/...` no caiga en
 * sus rutas `:id`.
 */
@Controller('product/public')
@ApiTags('Productos Público')
export class ProductPublicController {
  private readonly _source: PublicCatalogSource<Product>;

  constructor(
    productRepository: ProductRepository,
    private readonly _tenant: TenantContext,
  ) {
    this._source = {
      repository: productRepository,
      alias: 'product',
      idColumn: 'productId',
      idOf: (p) => p.productId,
      applyVisibility: (qb, a) => qb.andWhere(`${a}.isActive = true`),
      notFoundMessage: 'Producto no encontrado',
    };
  }

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Get('list')
  @ApiOperation({ summary: 'Productos activos del hotel del sitio (público)' })
  async list(@Query() params: PublicCatalogParamsDto) {
    return listPublicCatalog(this._source, this._tenant.requireOrganizationalId(), params);
  }

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Get(':id')
  @ApiOperation({ summary: 'Ficha pública de un producto' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await findPublicCatalogItem(
      this._source,
      this._tenant.requireOrganizationalId(),
      id,
    );
    return { statusCode: HttpStatus.OK, data };
  }
}
