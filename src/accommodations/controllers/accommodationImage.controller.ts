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
import { AccommodationImageService } from '../services/accommodationImage.service';
import {
  GetAccommodationImagesResponseDto,
  ReplaceAccommodationImageResponseDto,
  UploadAccommodationImageResponseDto,
} from '../dtos/accommodationImage.dto';

@Controller('accommodation-images')
@ApiTags('Imágenes de hospedajes')
export class AccommodationImageController {
  constructor(
    private readonly _cloudinaryService: CloudinaryService,
    private readonly _accommodationImageService: AccommodationImageService,
  ) {}

  // Obtener todas las imágenes de un alojamiento
  @Get(':id/images')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAccommodationImagesResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async getAccommodationImages(
    @Param('accommodationId') accommodationId: number,
  ): Promise<GetAccommodationImagesResponseDto> {
    const images =
      await this._accommodationImageService.getAccommodationImages(
        accommodationId,
      );

    return {
      statusCode: HttpStatus.OK,
      data: images,
    };
  }

  /**
   * Subir imagen de alojamiento
   */
  @Post(':id/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: UploadAccommodationImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Archivo de imagen del alojamiento',
    type: UploadImageDto,
  })
  async uploadAccommodationImage(
    @Param('accommodationId') accommodationId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadAccommodationImageResponseDto> {
    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.ACCOMMODATIONS,
    );

    const newImage =
      await this._accommodationImageService.addAccommodationImage(
        accommodationId,
        uploadResult.secure_url,
        uploadResult.public_id,
      );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Imagen de alojamiento subida exitosamente',
      data: {
        accommodationImageId: newImage.accommodationImageId,
        imageUrl: newImage.imageUrl,
        publicId: newImage.publicId,
      },
    };
  }

  /**
   * Eliminar imagen de alojamiento
   */
  @Delete(':id/image/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async deleteAccommodationImage(
    @Param('accommodationId') accommodationId: number,
    @Param('publicId') publicId: string,
  ): Promise<DeleteImageResponseDto> {
    await this._cloudinaryService.deleteImage(publicId);

    await this._accommodationImageService.removeAccommodationImage(
      accommodationId,
      publicId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de alojamiento eliminada exitosamente',
    };
  }

  /**
   * Reemplazar imagen de alojamiento
   */
  @Post(':id/image/replace/:publicId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ReplaceAccommodationImageResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBody({
    description: 'Nueva imagen del alojamiento',
    type: UploadImageDto,
  })
  async replaceAccommodationImage(
    @Param('accommodationId') accommodationId: number,
    @Param('publicId') publicId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ReplaceAccommodationImageResponseDto> {
    await this._cloudinaryService.deleteImage(publicId);

    const uploadResult = await this._cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.ACCOMMODATIONS,
    );

    const updatedImage =
      await this._accommodationImageService.replaceAccommodationImage(
        accommodationId,
        publicId,
        uploadResult.secure_url,
        uploadResult.public_id,
      );

    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen de alojamiento reemplazada exitosamente',
      data: {
        accommodationImageId: updatedImage.accommodationImageId,
        imageUrl: updatedImage.imageUrl,
        publicId: updatedImage.publicId,
      },
    };
  }
}
