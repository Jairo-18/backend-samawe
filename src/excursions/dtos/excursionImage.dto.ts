import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ExcursionImageResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la imagen de excursión',
  })
  excursionImageId: number;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/excursions/sample.jpg',
    description: 'URL de la imagen',
  })
  imageUrl: string;

  @ApiProperty({
    example: 'excursions/sample_abc123',
    description: 'ID público de Cloudinary',
  })
  publicId: string;
}

// DTOs de respuesta de excursión
export class UploadExcursionImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión subida exitosamente' })
  message: string;

  @ApiProperty({ type: ExcursionImageResponseDto })
  data: ExcursionImageResponseDto;
}

export class DeleteExcursionImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión eliminada exitosamente' })
  message: string;
}

export class ReplaceExcursionImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: ExcursionImageResponseDto })
  data: ExcursionImageResponseDto;
}

export class GetExcursionImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [ExcursionImageResponseDto],
    description: 'Lista de imágenes de la excursión',
  })
  data: ExcursionImageResponseDto[];
}

// DTO para parámetros de excursión
export class ExcursionImageParamsDto {
  @ApiProperty({ example: 1, description: 'ID de la excursión' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  excursionId: number;

  @ApiPropertyOptional({
    example: 'excursions/sample_abc123',
    description: 'Public ID de la imagen en Cloudinary',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  publicId?: string;
}
