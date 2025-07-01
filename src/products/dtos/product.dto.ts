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
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID del producto', required: false })
  @IsNumber()
  @IsOptional()
  productId: number;

  @ApiProperty({
    example: 'CC-12',
    description: 'Código de producto',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de producto es requerido' })
  code: string;

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
  @IsNumber()
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
    example: true,
    description: 'Indica si el producto está activo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
    example: 'CC-12',
    description: 'Código de producto',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El código de producto es requerido' })
  code: string;

  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Bebida gaseosa de 1 litro',
    description: 'Descripción del producto',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10, description: 'Cantidad disponible' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  amount?: number;

  @ApiProperty({ example: 1500.0, description: 'Precio de compra' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  priceBuy?: number;

  @ApiProperty({ example: 2000.0, description: 'Precio de venta' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  priceSale?: number;

  @ApiProperty({
    example: true,
    description: 'Indica si el producto está activo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría',
    required: true,
  })
  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  categoryTypeId?: number;
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
