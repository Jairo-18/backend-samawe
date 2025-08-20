import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

/* --------------------------------- PRODUCTOS --------------------------------- */

// DTO para subir imagen de producto
export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo de imagen a subir',
  })
  file: Express.Multer.File;
}

// DTO de imagen de producto
export class ProductImageResponseDto {
  @ApiProperty({ example: 1, description: 'ID único de la imagen' })
  productImageId: number;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/sample.jpg',
    description: 'URL de la imagen',
  })
  imageUrl: string;

  @ApiProperty({
    example: 'products/sample_abc123',
    description: 'ID público de Cloudinary',
  })
  publicId: string;
}

// DTOs de respuesta de producto
export class UploadImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen subida exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

export class DeleteImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen eliminada exitosamente' })
  message: string;
}

export class ReplaceImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

export class GetProductImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [ProductImageResponseDto],
    description: 'Lista de imágenes',
  })
  data: ProductImageResponseDto[];
}

// DTO para parámetros de ruta de producto
export class ProductImageParamsDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({
    example: 'products/sample_abc123',
    description: 'Public ID de la imagen en Cloudinary',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  publicId?: string;
}
