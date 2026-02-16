import {
  GET_EXCURSION_EXAMPLE,
  GET_ALL_EXCURSIONS_EXAMPLE,
} from './../constants/exampleExcursion.conts';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Excursion } from './../../shared/entities/excursion.entity';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExcursionDto {
  @ApiProperty({ example: 1, description: 'ID de la pasadía', required: false })
  @IsNumber()
  @IsOptional()
  excursionId: number;

  @ApiProperty({ example: 'TM-12', description: 'Código de excursión' })
  @IsString()
  @IsNotEmpty({ message: 'El código de excursión es requerido' })
  code: string;

  @ApiProperty({
    example: 'Tour Montaña',
    description: 'Nombre de la excursión',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    example: 'Excursión a la montaña con guía y refrigerios',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 150000,
    description: 'Precio de compra',
    required: false,
  })
  @IsNumber()
  @Min(0) // ahora acepta 0 o números positivos
  @IsOptional()
  priceBuy?: number;

  @ApiProperty({
    example: 200000,
    description: 'Precio de venta',
    required: false,
  })
  @IsNumber()
  @Min(0) // acepta 0 o números positivos
  @IsOptional()
  priceSale?: number;
  @ApiProperty({
    example: 1,
    description: 'ID del estado (relación con StateType)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El estado es requerido' })
  stateTypeId: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de categoría (relación con CategoryType)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryTypeId: number;
}

export class UpdateExcursionDto {
  @ApiProperty({
    example: 'TSWQ12',
    description: 'Código de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Tour Lago Azul',
    description: 'Nombre de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Excursión al Lago Azul con guía turística',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 150000,
    description: 'Precio de compra',
    required: false,
  })
  @IsNumber()
  @Min(0) // ahora acepta 0 o números positivos
  @IsOptional()
  priceBuy?: number;

  @ApiProperty({
    example: 200000,
    description: 'Precio de venta',
    required: false,
  })
  @IsNumber()
  @Min(0) // acepta 0 o números positivos
  @IsOptional()
  priceSale?: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  categoryTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de estado',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  stateTypeId?: number;
}

export class GetExcursionDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: GET_EXCURSION_EXAMPLE,
  })
  data: Excursion;
}

export interface GetAllExcursionsResponse {
  excursions: Excursion[];
}

export class GetAllExcursionsResposeDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    example: GET_ALL_EXCURSIONS_EXAMPLE,
  })
  data: GetAllExcursionsResponse;
}
