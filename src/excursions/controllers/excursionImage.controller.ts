import {
  DeleteImageResponseDto,
  UploadImageDto,
} from './../../products/dtos/productImage.dto';
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
import { ExcursionImageService } from '../services/excursionImage.service';
import {
  GetExcursionImagesResponseDto,
  ReplaceExcursionImageResponseDto,
  UploadExcursionImageResponseDto,
} from '../dtos/excursionImage.dto';

@Controller('excursion-images')
@ApiTags('Imágenes de pasadías')
export class ExcursionImageController {
  constructor(
    private readonly _cloudinaryService: CloudinaryService,
    private readonly _excursionImageService: ExcursionImageService,
  ) {}

  // Agregar este método para obtener todas las imágenes de un pasadía
  @Get(':id/images')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetExcursionImagesResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async getProductImages(
    @Param('excursionId') excursionId: number,
  ): Promise<GetExcursionImagesResponseDto> {
    const images =
      await this._excursionImageService.getExcursionImages(excursionId);

    return {
      statusCode: HttpStatus.OK,
      data: images,
    };
  }

  /**
   * Subir imagen de pasadía
   */
  @Post(':id/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: UploadExcursionImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Archivo de imagen del pasadía',
    type: UploadImageDto,
  })
  async uploadProductImage(
    @Param('excursionId') excursionId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadExcursionImageResponseDto> {
    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.EXCURSIONS,
    );

    // Guardar en la tabla pasadía
    const newImage = await this._excursionImageService.addExcursionImage(
      excursionId,
      uploadResult.secure_url,
      uploadResult.public_id,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Imagen de pasadía subida exitosamente',
      data: {
        excursionImageId: newImage.excursionImageId,
        imageUrl: newImage.imageUrl,
        publicId: newImage.publicId,
      },
    };
  }

  /**
   * Eliminar imagen de pasadía
   */
  @Delete(':id/image/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async deleteProductImage(
    @Param('excursionId') excursionId: number,
    @Param('publicId') publicId: string,
  ): Promise<DeleteImageResponseDto> {
    // 1. eliminar de cloudinary
    await this._cloudinaryService.deleteImage(publicId);

    // 2. eliminar de BD
    await this._excursionImageService.removeExcursionImage(
      excursionId,
      publicId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de pasadía eliminada exitosamente',
    };
  }

  /**
   * Reemplazar imagen de pasadía
   */
  @Post(':id/image/replace/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ReplaceExcursionImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Nueva imagen del pasadía',
    type: UploadImageDto,
  })
  async replaceProductImage(
    @Param('excursionId') excursionId: number,
    @Param('publicId') publicId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ReplaceExcursionImageResponseDto> {
    // 1. eliminar anterior de cloudinary
    await this._cloudinaryService.deleteImage(publicId);

    // 2. subir nueva
    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.EXCURSIONS,
    );

    const updatedImage =
      await this._excursionImageService.replaceExcursionImage(
        excursionId,
        publicId,
        uploadResult.secure_url,
        uploadResult.public_id,
      );

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de pasadía reemplazada exitosamente',
      data: {
        excursionImageId: updatedImage.excursionImageId,
        imageUrl: updatedImage.imageUrl,
        publicId: updatedImage.publicId,
      },
    };
  }
}
