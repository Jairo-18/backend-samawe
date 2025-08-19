import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO para subir imagen
export class UploadProductImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo de imagen a subir',
  })
  file: Express.Multer.File;
}

// DTO para la respuesta de imagen
export class ProductImageResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la imagen del producto',
  })
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

// DTO para respuesta de subida exitosa
export class UploadImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto subida exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

// DTO para respuesta de eliminación exitosa
export class DeleteImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto eliminada exitosamente' })
  message: string;
}

// DTO para respuesta de reemplazo exitoso
export class ReplaceImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

// DTO para listar imágenes de un producto
export class GetProductImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [ProductImageResponseDto],
    description: 'Lista de imágenes del producto',
  })
  data: ProductImageResponseDto[];
}

// DTO para validar parámetros de ruta
export class ProductImageParamsDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto',
  })
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
