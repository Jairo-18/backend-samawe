import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PaginatedListExcursionsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'EXC-001',
    description: 'Código de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Tour Isla del Sol',
    description: 'Nombre de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Excursión de día completo a la Isla del Sol',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 150.5,
    description: 'Precio de compra',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceBuy?: number;

  @ApiProperty({
    example: 250.75,
    description: 'Precio de venta',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceSale?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de estado',
    required: false,
  })
  @IsOptional()
  @IsString()
  stateType?: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryType?: number;

  @ApiProperty({
    example: 'uuid-de-organizacion',
    description: 'Filtrar por ID de organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
}

export class PaginatedExcursionSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Paseo río',
    description: 'Texto de búsqueda por nombre de la pasadía',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PartialExcursionDto {
  @ApiProperty({
    example: { es: 'Paseo rio', en: 'River walk' },
    description: 'Nombre de la excursion',
  })
  name: Record<string, string>;
}

/**
 * DTO para la imagen de un hospedaje
 */
export class ExcursionImageDto {
  @ApiProperty({ example: 1, description: 'ID de la imagen' })
  excursionImageId: number;

  @ApiProperty({ example: 'https://...', description: 'URL de la imagen' })
  imageUrl: string;

  @ApiProperty({
    example: 'publicId123',
    description: 'ID público   ',
  })
  publicId: string;
}

/**
 * DTO para un hospedaje con imágenes
 */
export class ExcursionWithImagesDto {
  @ApiProperty({ example: 0 })
  excursionId: number;

  @ApiProperty({ example: 'ACM-001' })
  code?: string;

  @ApiProperty({ example: { es: 'Pasadía Playa Bonita', en: 'Beautiful Beach Day Trip' } })
  name: Record<string, string>;

  @ApiProperty({ example: { es: 'Pasadía frente al mar con todas las comodidades', en: 'Beach day trip with all amenities' } })
  description?: Record<string, string>;

  @ApiProperty({ example: 12000 })
  priceBuy: number;

  @ApiProperty({ example: 23000 })
  priceSale: number;

  @ApiProperty({ example: 1 })
  categoryTypeId?: number;

  @ApiProperty({ example: 1 })
  stateTypeId?: number;

  @ApiProperty({ type: [ExcursionImageDto] })
  images: ExcursionImageDto[];

  @ApiPropertyOptional({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
  })
  organizationalId?: string;
}
