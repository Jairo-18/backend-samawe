import {
  PaginatedListProductsParamsDto,
  PaginatedProductSelectParamsDto,
  PartialProductDto,
} from './../dtos/crudProduct.dto';
import { Product } from './../../shared/entities/product.entity';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductDto,
  GetAllProductsResposeDto,
} from './../dtos/product.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductUC } from '../useCases/productUC.uc';
import { AuthGuard } from '@nestjs/passport';
import { CrudProductUC } from '../useCases/crudProductUC.uc';
import { ProductInterfacePaginatedList } from '../interface/product.interface';

@Controller('product')
@ApiTags('Productos')
export class ProductController {
  constructor(
    private readonly _productUC: ProductUC,
    private readonly _crudProductUC: CrudProductUC,
  ) {}

  @Get('/paginated-partial')
  @ApiOkResponse({ type: ResponsePaginationDto<PartialProductDto> })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedPartial(
    @Query() params: PaginatedProductSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialProductDto>> {
    return this._crudProductUC.paginatedPartialProduct(params);
  }

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() productDto: CreateProductDto,
  ): Promise<CreatedRecordResponseDto> {
    const createdProduct = await this._productUC.create(productDto);

    return {
      message: 'Registro de producto exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createdProduct.productId.toString(),
        ...createdProduct,
      },
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllProductsResposeDto })
  async findAll(): Promise<GetAllProductsResposeDto> {
    const products = await this._productUC.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: { products },
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UpdateRecordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async update(
    @Param('id') productId: string,
    @Body() productData: UpdateProductDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._productUC.update(productId, productData);

    return {
      message: 'Producto actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/paginated-list')
  @ApiOkResponse({ type: ResponsePaginationDto<Product> })
  // @ApiBearerAuth()
  // @UseGuards(AuthGuard())
  async getPaginatedList(
    @Query() params: PaginatedListProductsParamsDto,
  ): Promise<ResponsePaginationDto<ProductInterfacePaginatedList>> {
    return await this._crudProductUC.paginatedList(params);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetProductDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async findOne(@Param('id') productId: string): Promise<GetProductDto> {
    const user = await this._productUC.findOne(productId);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(
    @Param('id') producId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._productUC.delete(producId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Producto eliminado exitosamente',
    };
  }
}
