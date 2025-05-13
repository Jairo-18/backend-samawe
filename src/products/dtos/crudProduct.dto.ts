import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '../models/product.model';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export interface CreateProductRelatedDataDto {
  taxeType?: TaxeType[];
  categoryType: CategoryType[];
}

export class CreateProductRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos relacionados con producto',
  })
  data: CreateProductRelatedDataDto;
}

export class PaginatedListProductsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 1,
    description: 'Tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryType?: number;

  @ApiProperty({
    example: 1232,
    description: 'Código de producto',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  code?: number;

  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'La coca cola es rica',
    description: 'Descripción del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 23,
    description: 'Unidades del producto',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({
    example: 12000,
    description: 'Precio de compra',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priceBuy?: number;

  @ApiProperty({
    example: 23000,
    description: 'Precio de venta',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priceSale?: number;
}
