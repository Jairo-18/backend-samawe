import {
  DeleteImageResponseDto,
  GetProductImagesResponseDto,
  ReplaceImageResponseDto,
  UploadImageResponseDto,
  UploadImageDto,
} from './../dtos/productImage.dto';
import { ProductImageService } from './../services/productImage.service';
import { CloudinaryFolders } from './../../cloudinary/constants/cloudinary.constants';
import { CloudinaryService } from './../../cloudinary/services/cloudinary.service';
import { NotFoundResponseDto } from './../../shared/dtos/response.dto';
import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('product-images')
@ApiTags('Imágenes de productos')
export class ProductImageController {
  constructor(
    private readonly _cloudinaryService: CloudinaryService,
    private readonly _productImageService: ProductImageService,
  ) {}

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
    type: UploadImageDto,
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
    type: UploadImageDto,
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
