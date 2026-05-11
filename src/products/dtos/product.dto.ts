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
  IsObject,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { TranslatedInput } from '../../shared/types/translated-field.type';

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
    example: { es: 'Coca Cola 1L' },
    description: 'Nombre del producto',
    required: true,
  })
  @IsObject()
  @IsNotEmpty({ message: 'El nombre del producto es requerido' })
  name: TranslatedInput;

  @ApiProperty({
    example: { es: 'Bebida gaseosa de 1 litro' },
    description: 'Descripción del producto',
    required: false,
  })
  @IsObject()
  @IsOptional()
  description?: TranslatedInput;

  @ApiProperty({
    example: 10,
    description: 'Cantidad disponible',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount: number;

  @ApiProperty({
    example: 150000,
    description: 'Precio de compra',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceBuy?: number;

  @ApiProperty({
    example: 200000,
    description: 'Precio de venta',
    required: false,
  })
  @IsNumber()
  @Min(0)
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
    description: 'ID del tipo de impuesto por defecto (IVA, IPOCONSUMO, etc.)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  taxeTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría (relación con CategoryType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryTypeId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la unidad de medida del producto',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  unitOfMeasureId?: number;

  @ApiProperty({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
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

  @ApiProperty({ example: { es: 'Coca Cola 1L' }, description: 'Nombre del producto' })
  @IsObject()
  @IsOptional()
  name?: TranslatedInput;

  @ApiProperty({ example: { es: 'Bebida gaseosa de 1 litro' }, description: 'Descripción del producto' })
  @IsObject()
  @IsOptional()
  description?: TranslatedInput;

  @ApiProperty({ example: 10, description: 'Cantidad disponible' })
  @IsOptional()
  @Min(0)
  @IsNumber()
  amount?: number;

  @ApiProperty({
    example: 150000,
    description: 'Precio de compra',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceBuy?: number;

  @ApiProperty({
    example: 200000,
    description: 'Precio de venta',
    required: false,
  })
  @IsNumber()
  @Min(0)
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
    description: 'ID del tipo de impuesto por defecto (IVA, IPOCONSUMO, etc.)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  taxeTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría',
    required: true,
  })
  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  categoryTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la unidad de medida del producto',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  unitOfMeasureId?: number;

  @ApiProperty({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
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
  data: any;
}
