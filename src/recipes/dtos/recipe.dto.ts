import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Recipe } from './../../shared/entities/recipe.entity';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para ingredientes de una receta
 */
export class RecipeIngredientDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto que funciona como ingrediente',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del producto ingrediente es requerido' })
  ingredientProductId: number;

  @ApiProperty({
    example: 0.25,
    description:
      'Cantidad de ingrediente por porción (en la unidad del ingrediente)',
    required: true,
  })
  @IsNumber()
  @Min(0.001, { message: 'La cantidad debe ser mayor a 0' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  quantity: number;

  @ApiProperty({
    example: 'Para el arroz de la guarnición',
    description: 'Notas sobre este ingrediente en la receta',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO para crear una receta completa de un plato
 */
export class CreateRecipeDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto (plato del menú)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: number;

  @ApiProperty({
    type: [RecipeIngredientDto],
    description: 'Lista de ingredientes con sus cantidades',
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos un ingrediente' })
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];
}

/**
 * DTO para actualizar ingredientes de una receta existente
 */
export class UpdateRecipeDto {
  @ApiProperty({
    type: [RecipeIngredientDto],
    description: 'Lista actualizada de ingredientes (reemplazará la existente)',
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos un ingrediente' })
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];
}

/**
 * DTO para actualizar un solo ingrediente de la receta
 */
export class UpdateRecipeIngredientDto {
  @ApiProperty({
    example: 0.3,
    description: 'Nueva cantidad del ingrediente',
  })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    example: 'Ajustar cantidad según temporada',
    description: 'Notas actualizadas',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Respuesta con información de la receta completa
 */
export interface RecipeWithDetailsResponse {
  productId: number;
  productName: string;
  ingredients: Array<{
    ingredientProductId: number;
    ingredientProductName: string;
    unit: string;
    quantity: number;
    cost: number;
    totalCost: number;
    notes?: string;
  }>;
  totalRecipeCost: number;
}

export class GetRecipeDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    description: 'Receta con detalles de ingredientes',
  })
  data: RecipeWithDetailsResponse;
}

export class GetAllRecipesDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    description: 'Lista de recetas',
  })
  data: Recipe[];
}

/**
 * DTO para verificar disponibilidad de ingredientes
 */
export class CheckIngredientsAvailabilityDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto (plato)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad de porciones a preparar',
    required: true,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  portions?: number;
}

export interface IngredientAvailability {
  ingredientProductId: number;
  ingredientProductName: string;
  required: number;
  available: number;
  unit: string;
  isAvailable: boolean;
}

export interface CheckAvailabilityResponse {
  productId: number;
  productName: string;
  portions: number;
  canPrepare: boolean;
  ingredients: IngredientAvailability[];
  missingIngredients: IngredientAvailability[];
}
