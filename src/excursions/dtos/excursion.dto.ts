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
  IsObject,
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
    example: { es: 'Tour Montaña', en: 'Mountain Tour' },
    description: 'Nombre de la excursión',
  })
  @IsObject()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: Record<string, string>;

  @ApiProperty({
    example: { es: 'Excursión a la montaña con guía y refrigerios', en: 'Mountain excursion with guide and snacks' },
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

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

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de impuesto por defecto (IVA, IPOCONSUMO, etc.)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  taxeTypeId?: number;

  @ApiProperty({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
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
    example: { es: 'Tour Lago Azul', en: 'Blue Lake Tour' },
    description: 'Nombre de la excursión',
    required: false,
  })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @ApiProperty({
    example: { es: 'Excursión al Lago Azul con guía turística', en: 'Blue Lake excursion with tourist guide' },
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

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

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de impuesto por defecto (IVA, IPOCONSUMO, etc.)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  taxeTypeId?: number;

  @ApiProperty({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
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
  data: any;
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
