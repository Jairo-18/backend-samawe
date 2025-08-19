import {
  DeleteImageResponseDto,
  GetProductImagesResponseDto,
  ReplaceImageResponseDto,
  UploadImageResponseDto,
  UploadProductImageDto,
} from './../dtos/productImage.dto';
import { ProductImageService } from './../services/productImage.service';
import { CloudinaryFolders } from './../../cloudinary/constants/cloudinary.constants';
import { CloudinaryService } from './../../cloudinary/services/cloudinary.service';
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductUC } from '../useCases/productUC.uc';
import { AuthGuard } from '@nestjs/passport';
import { CrudProductUC } from '../useCases/crudProductUC.uc';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('product')
@ApiTags('Productos')
export class ProductController {
  constructor(
    private readonly _productUC: ProductUC,
    private readonly _crudProductUC: CrudProductUC,
    private readonly _cloudinaryService: CloudinaryService,
    private readonly _productImageService: ProductImageService,
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
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedList(
    @Query() params: PaginatedListProductsParamsDto,
  ): Promise<ResponsePaginationDto<Product>> {
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

  // Agregar este método para obtener todas las imágenes de un producto
  @Get(':id/images')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetProductImagesResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async getProductImages(
    @Param('productId') productId: number,
  ): Promise<GetProductImagesResponseDto> {
    const images = await this._productImageService.getProductImages(productId);

    return {
      statusCode: HttpStatus.OK,
      data: images,
    };
  }

  /**
   * Subir imagen de producto
   */
  @Post(':id/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: UploadImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Archivo de imagen del producto',
    type: UploadProductImageDto,
  })
  async uploadProductImage(
    @Param('productId') productId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadImageResponseDto> {
    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.PRODUCTS,
    );

    // Guardar en la tabla product_images
    const newImage = await this._productImageService.addProductImage(
      productId,
      uploadResult.secure_url,
      uploadResult.public_id,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Imagen de producto subida exitosamente',
      data: {
        productImageId: newImage.productImageId,
        imageUrl: newImage.imageUrl,
        publicId: newImage.publicId,
      },
    };
  }

  /**
   * Eliminar imagen de producto
   */
  @Delete(':id/image/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async deleteProductImage(
    @Param('productId') productId: number,
    @Param('publicId') publicId: string,
  ): Promise<DeleteImageResponseDto> {
    // 1. eliminar de cloudinary
    await this._cloudinaryService.deleteImage(publicId);

    // 2. eliminar de BD
    await this._productImageService.removeProductImage(productId, publicId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de producto eliminada exitosamente',
    };
  }

  /**
   * Reemplazar imagen de producto
   */
  @Post(':id/image/replace/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ReplaceImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Nueva imagen del producto',
    type: UploadProductImageDto,
  })
  async replaceProductImage(
    @Param('productId') productId: number,
    @Param('publicId') publicId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ReplaceImageResponseDto> {
    // 1. eliminar anterior de cloudinary
    await this._cloudinaryService.deleteImage(publicId);

    // 2. subir nueva
    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.PRODUCTS,
    );

    // 3. actualizar en BD (reemplazar fila con ese publicId por la nueva info)
    const updatedImage = await this._productImageService.replaceProductImage(
      productId,
      publicId,
      uploadResult.secure_url,
      uploadResult.public_id,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de producto reemplazada exitosamente',
      data: {
        productImageId: updatedImage.productImageId,
        imageUrl: updatedImage.imageUrl,
        publicId: updatedImage.publicId,
      },
    };
  }
}
