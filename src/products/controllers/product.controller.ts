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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductUC } from '../useCases/product.uc';

import { AuthGuard } from '@nestjs/passport';
import { CrudProductUseCase } from '../useCases/crudProduct.uc';
import { CreateProductRelatedDataReponseDto } from '../dtos/crudProduct.dto';

@Controller('product')
@ApiTags('Productos')
export class ProductController {
  constructor(
    private readonly _productUC: ProductUC,
    private readonly _crudProductUseCase: CrudProductUseCase,
  ) {}

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
      message: 'Registro exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createdProduct.productId.toString(),
        ...createdProduct,
      },
    };
  }

  @Get('/create/related-data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateProductRelatedDataReponseDto })
  async getRelatedData(): Promise<CreateProductRelatedDataReponseDto> {
    const data = await this._crudProductUseCase.getRelatedDataToCreate();
    return {
      statusCode: HttpStatus.OK,
      data,
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
    @Param('id') producId: string,
  ): Promise<DeleteReCordResponseDto> {
    await this._productUC.delete(producId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Producto eliminado exitosamente',
    };
  }
}
