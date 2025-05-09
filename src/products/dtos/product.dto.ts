import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Product } from './../../shared/entities/product.entity';
import {
  GET_ALL_PRODUCTS_EXAMPLE,
  GET_PRODUCT_EXAMPLE,
} from './../constants/examplesProduct.conts';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsPositive,
  IsInt,
  IsNumber,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID del producto', required: true })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: number;

  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es requerido' })
  name: string;

  @ApiProperty({
    example: 'Bebida gaseosa de 1 litro',
    description: 'Descripción del producto',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 10,
    description: 'Cantidad disponible',
    required: true,
  })
  @IsInt()
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  amount: number;

  @ApiProperty({
    example: 1500.0,
    description: 'Precio de compra',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  priceBuy: number;

  @ApiProperty({
    example: 2000.0,
    description: 'Precio de venta',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  priceSale: number;

  @ApiProperty({
    example: 0.19,
    description: 'Impuesto del producto',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  TaxeType: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría (relación con CategoryType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryTypeId: number;
}

export class UpdateProductDto {
  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
  })
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Bebida gaseosa de 1 litro',
    description: 'Descripción del producto',
  })
  @IsString()
  description?: string;

  @ApiProperty({ example: 10, description: 'Cantidad disponible' })
  @IsNumber()
  amount?: number;

  @ApiProperty({ example: 1500.0, description: 'Precio de compra' })
  @IsNumber()
  @IsPositive()
  priceBuy?: number;

  @ApiProperty({ example: 2000.0, description: 'Precio de venta' })
  @IsNumber()
  @IsPositive()
  priceSale?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  // @MaxLength(200, { message: 'Máximos carácteres de 200' })
  categoryTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría',
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  // @IsOptional()
  // @MaxLength(200, { message: 'Máximos carácteres de 200' })
  TaxeTypeId?: number;
}

export interface GetAllProductsRespose {
  products: Product[];
}

export class GetAllProductsResposeDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    example: GET_ALL_PRODUCTS_EXAMPLE,
  })
  data: GetAllProductsRespose;
}

export class GetProductDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: GET_PRODUCT_EXAMPLE,
  })
  data: Product;
}
