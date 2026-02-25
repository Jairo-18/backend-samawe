import {
  PaginatedListProductsParamsDto,
  PaginatedProductSelectParamsDto,
  PartialProductDto,
} from './../dtos/crudProduct.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductDto,
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LocalStorageService } from './../../local-storage/services/local-storage.service';
import { ProductImageService } from '../services/productImage.service';
import { ApiTags } from '@nestjs/swagger';
import { ProductUC } from '../useCases/productUC.uc';
import { AuthGuard } from '@nestjs/passport';
import { CrudProductUC } from '../useCases/crudProductUC.uc';
import { ProductInterfacePaginatedList } from '../interface/product.interface';
import {
  GetPaginatedPartialDocs,
  CreateProductDocs,
  UpdateProductDocs,
  GetPaginatedListDocs,
  FindOneProductDocs,
  DeleteProductDocs,
  UploadImageDocs,
  GetImagesDocs,
  DeleteImageDocs,
} from '../decorators/product.decorators';

@Controller('product')
@ApiTags('Productos')
export class ProductController {
  constructor(
    private readonly _productUC: ProductUC,
    private readonly _crudProductUC: CrudProductUC,
    private readonly _productImageService: ProductImageService,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  @Get('/paginated-partial')
  @UseGuards(AuthGuard())
  @GetPaginatedPartialDocs()
  async getPaginatedPartial(
    @Query() params: PaginatedProductSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialProductDto>> {
    return this._crudProductUC.paginatedPartialProduct(params);
  }

  @Post('create')
  @UseGuards(AuthGuard())
  @CreateProductDocs()
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

  @Patch(':id')
  @UseGuards(AuthGuard())
  @UpdateProductDocs()
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
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListProductsParamsDto,
  ): Promise<ResponsePaginationDto<ProductInterfacePaginatedList>> {
    return await this._crudProductUC.paginatedList(params);
  }

  @Get(':id')
  @UseGuards(AuthGuard())
  @FindOneProductDocs()
  async findOne(@Param('id') productId: string): Promise<GetProductDto> {
    const user = await this._productUC.findOne(productId);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard())
  @DeleteProductDocs()
  async delete(
    @Param('id') producId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._productUC.delete(producId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Producto eliminado exitosamente',
    };
  }

  @Post(':id/images')
  @UseGuards(AuthGuard())
  @UploadImageDocs()
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') productId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploadResult = await this._localStorageService.saveImage(
      file,
      'products',
    );
    const addedImage = await this._productImageService.addProductImage(
      productId,
      uploadResult.imageUrl,
      uploadResult.publicId,
    );

    return {
      message: 'Imagen subida correctamente',
      data: addedImage,
    };
  }

  @Get(':id/images')
  @UseGuards(AuthGuard())
  @GetImagesDocs()
  async getImages(@Param('id') productId: number) {
    const images = await this._productImageService.getProductImages(productId);
    return {
      data: images,
    };
  }

  @Delete(':id/images/*publicId')
  @UseGuards(AuthGuard())
  @DeleteImageDocs()
  async deleteImage(
    @Param('id') productId: number,
    @Param('publicId') publicId: string,
  ) {
    const decodedPublicId = decodeURIComponent(publicId);
    await this._localStorageService.deleteImage(decodedPublicId);
    await this._productImageService.removeProductImage(
      productId,
      decodedPublicId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen eliminada exitosamente',
    };
  }
}
