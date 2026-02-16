import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AccommodationImageResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la imagen de alojamiento',
  })
  accommodationImageId: number;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/accommodations/sample.jpg',
    description: 'URL de la imagen',
  })
  imageUrl: string;

  @ApiProperty({
    example: 'accommodations/sample_abc123',
    description: 'ID público de Cloudinary',
  })
  publicId: string;
}

// DTOs de respuesta de alojamiento
export class UploadAccommodationImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de alojamiento subida exitosamente' })
  message: string;

  @ApiProperty({ type: AccommodationImageResponseDto })
  data: AccommodationImageResponseDto;
}

export class DeleteAccommodationImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de alojamiento eliminada exitosamente' })
  message: string;
}

export class ReplaceAccommodationImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de alojamiento reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: AccommodationImageResponseDto })
  data: AccommodationImageResponseDto;
}

export class GetAccommodationImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [AccommodationImageResponseDto],
    description: 'Lista de imágenes del alojamiento',
  })
  data: AccommodationImageResponseDto[];
}

// DTO para parámetros de alojamiento
export class AccommodationImageParamsDto {
  @ApiProperty({ example: 1, description: 'ID del alojamiento' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  accommodationId: number;

  @ApiPropertyOptional({
    example: 'accommodations/sample_abc123',
    description: 'Public ID de la imagen en Cloudinary',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  publicId?: string;
}
