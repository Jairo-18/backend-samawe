import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { BedType } from './../../shared/entities/bedType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { HttpStatus } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

/**
 * Datos relacionados para creación de hospedajes
 */
export interface CreateRelatedDataServicesAndProductsDto {
  stateType?: StateType[];
  categoryType: CategoryType[];
  bedType: BedType[];
}

export class CreateRelatedDataServicesAndProductsResponseDto
  implements BaseResponseDto
{
  @ApiProperty({ type: Number, example: HttpStatus.OK })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: 'Datos relacionados para productos y servicios',
  })
  data: CreateRelatedDataServicesAndProductsDto;
}

/**
 * Parámetros de paginación para listado de hospedajes
 */
export class PaginatedListAccommodationsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'ACM-001',
    description: 'Código del hospedaje',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Hotel Playa Bonita',
    description: 'Nombre del hospedaje',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Hospedaje frente al mar con todas las comodidades',
    description: 'Descripción del hospedaje',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 4,
    description: 'Cantidad de personas permitidas',
    required: false,
  })
  @IsOptional()
  @IsString()
  amountPerson?: number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad de habitaciones',
    required: false,
  })
  @IsOptional()
  @IsString()
  amountRoom?: number;

  @ApiProperty({
    example: 1,
    description: 'Cantidad de baños',
    required: false,
  })
  @IsOptional()
  @IsString()
  amountBathroom?: number;

  @ApiProperty({
    example: true,
    description: 'Si tiene jacuzzi o no',
    required: false,
  })
  @IsOptional()
  @IsString()
  jacuzzi?: boolean;

  @ApiProperty({
    example: 12000,
    description: 'Precio de compra',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceBuy?: number;

  @ApiProperty({
    example: 23000,
    description: 'Precio de venta',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceSale?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryType?: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de cama',
    required: false,
  })
  @IsOptional()
  @IsString()
  bedType?: number;

  @ApiProperty({ example: 1, description: 'ID del estado', required: false })
  @IsOptional()
  @IsString()
  stateType?: number;
}

/**
 * Parámetros de selección parcial
 */
export class PaginatedAccommodationSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Cabaña',
    description: 'Texto de búsqueda por nombre del hospedaje',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO para un hospedaje parcial (solo nombre)
 */
export class PartialAccommodationDto {
  @ApiProperty({ example: 'Cabaña', description: 'Nombre del hospedaje' })
  name: string;
}

/**
 * DTO para la imagen de un hospedaje
 */
export class AccommodationImageDto {
  @ApiProperty({ example: 1, description: 'ID de la imagen' })
  accommodationImageId: number;

  @ApiProperty({ example: 'https://...', description: 'URL de la imagen' })
  imageUrl: string;

  @ApiProperty({
    example: 'publicId123',
    description: 'ID público en Cloudinary',
  })
  publicId: string;
}

/**
 * DTO para un hospedaje con imágenes
 */
export class AccommodationWithImagesDto {
  @ApiProperty({ example: 1 })
  accommodationId: number;

  @ApiProperty({ example: 'ACM-001' })
  code?: string;

  @ApiProperty({ example: 'Hotel Playa Bonita' })
  name: string;

  @ApiProperty({ example: 'Hospedaje frente al mar con todas las comodidades' })
  description?: string;

  @ApiProperty({ example: 4 })
  amountPerson?: number;

  @ApiProperty({ example: 2 })
  amountRoom?: number;

  @ApiProperty({ example: 1 })
  amountBathroom?: number;

  @ApiProperty({ example: true })
  jacuzzi: boolean;

  @ApiProperty({ example: 12000 })
  priceBuy: number;

  @ApiProperty({ example: 23000 })
  priceSale: number;

  @ApiProperty({ example: 1 })
  categoryTypeId?: number;

  @ApiProperty({ example: 2 })
  bedTypeId?: number;

  @ApiProperty({ example: 1 })
  stateTypeId?: number;

  @ApiProperty({ type: [AccommodationImageDto] })
  images: AccommodationImageDto[];
}
