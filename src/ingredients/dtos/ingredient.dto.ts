import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Ingredient } from './../../shared/entities/ingredient.entity';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateIngredientDto {
  @ApiProperty({
    example: 'Arroz',
    description: 'Nombre del ingrediente',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del ingrediente es requerido' })
  name: string;

  @ApiProperty({
    example: 'Arroz blanco para preparaciones',
    description: 'Descripción del ingrediente',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'kg',
    description: 'Unidad de medida (kg, litros, unidades, gramos, etc.)',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La unidad de medida es requerida' })
  unit: string;

  @ApiProperty({
    example: 50,
    description: 'Cantidad disponible en stock',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    example: 10,
    description: 'Stock mínimo para alertas',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiProperty({
    example: 5000,
    description: 'Costo por unidad',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({
    example: true,
    description: 'Indica si el ingrediente está activo',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateIngredientDto {
  @ApiProperty({
    example: 'Arroz',
    description: 'Nombre del ingrediente',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Arroz blanco para preparaciones',
    description: 'Descripción del ingrediente',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'kg',
    description: 'Unidad de medida',
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({
    example: 50,
    description: 'Cantidad disponible en stock',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    example: 10,
    description: 'Stock mínimo para alertas',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiProperty({
    example: 5000,
    description: 'Costo por unidad',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({
    example: true,
    description: 'Indica si el ingrediente está activo',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustStockDto {
  @ApiProperty({
    example: 20,
    description:
      'Cantidad a ajustar (positivo para agregar, negativo para reducir)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  quantity: number;

  @ApiProperty({
    example: 'Compra de proveedor',
    description: 'Motivo del ajuste',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export interface GetAllIngredientsResponse {
  ingredients: Ingredient[];
}

export class GetAllIngredientsResponseDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    description: 'Lista de ingredientes',
  })
  data: GetAllIngredientsResponse;
}

export class GetIngredientDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    description: 'Ingrediente',
  })
  data: Ingredient;
}
