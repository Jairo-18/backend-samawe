import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProductImageResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la imagen del producto',
  })
  productImageId: number;

  @ApiProperty({
    example: 'https://api.samawe.com/uploads/products/uuid.jpg',
    description: 'URL pública de la imagen',
  })
  imageUrl: string;

  @ApiProperty({
    example: 'products/uuid.jpg',
    description: 'Ruta relativa del archivo en el servidor',
  })
  publicId: string;
}

export class UploadProductImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto subida exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

export class DeleteProductImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto eliminada exitosamente' })
  message: string;
}

export class ReplaceProductImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de producto reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: ProductImageResponseDto })
  data: ProductImageResponseDto;
}

export class GetProductImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [ProductImageResponseDto],
    description: 'Lista de imágenes del producto',
  })
  data: ProductImageResponseDto[];
}

export class ProductImageParamsDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({
    example: 'products/uuid.jpg',
    description: 'Public ID de la imagen (ruta relativa del archivo)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  publicId?: string;
}
