import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { BedType } from './../../shared/entities/bedType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { HttpStatus } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

export interface CreateRelatedDataServicesAndProductsDto {
  stateType?: StateType[];
  categoryType: CategoryType[];
  bedType: BedType[];
}

export class CreateRelatedDataServicesAndProductsResponseDto
  implements BaseResponseDto
{
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos relacionados para productos y servicios',
  })
  data: CreateRelatedDataServicesAndProductsDto;
}

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

  @ApiProperty({
    example: 1,
    description: 'ID del estado',
    required: false,
  })
  @IsOptional()
  @IsString()
  stateType?: number;
}

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

export class PartialAccommodationDto {
  @ApiProperty({
    example: 'Cabaña',
    description: 'Nombre del hospedaje',
  })
  name: string;
}
