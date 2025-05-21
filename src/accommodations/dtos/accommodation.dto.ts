import {
  GET_ALL_ACCOMMODATIONS_EXAMPLE,
  GET_ACCOMMODATION_EXAMPLE,
} from './../constants/exampleAccommodation.conts';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsPositive,
  IsInt,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccommodationDto {
  @ApiProperty({ example: 1, description: 'ID del hospedaje', required: false })
  @IsNumber()
  @IsOptional()
  accommodationId: number;

  @ApiProperty({ example: 'CC-12', description: 'Código de hospedaje' })
  @IsString()
  @IsNotEmpty({ message: 'El código de hospedaje es requerido' })
  code: string;

  @ApiProperty({ example: 'Cabaña Sur', description: 'Nombre del hospedaje' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    example: 'Cabaña familiar con vista al lago',
    description: 'Descripción del hospedaje',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4, description: 'Cantidad de personas' })
  @IsInt()
  @IsNotEmpty({ message: 'La cantidad de personas es requerida' })
  amountPerson: number;

  @ApiProperty({ example: true, description: '¿Tiene jacuzzi?' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsNotEmpty({ message: 'Debe indicar si tiene jacuzzi' })
  jacuzzi: boolean;

  @ApiProperty({ example: 2, description: 'Cantidad de habitaciones' })
  @IsInt()
  @IsNotEmpty({ message: 'La cantidad de habitaciones es requerida' })
  amountRoom: number;

  @ApiProperty({ example: 1, description: 'Cantidad de baños' })
  @IsInt()
  @IsNotEmpty({ message: 'La cantidad de baños es requerida' })
  amountBathroom: number;

  @ApiProperty({ example: 1500.0, description: 'Precio de compra' })
  @IsNumber()
  @IsPositive()
  priceBuy: number;

  @ApiProperty({ example: 2000.0, description: 'Precio de venta' })
  @IsNumber()
  @IsPositive()
  priceSale: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría (relación con CategoryType)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryTypeId: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de cama (relación con BedType)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El tipo de cama es requerido' })
  bedTypeId: number;

  @ApiProperty({
    example: 3,
    description: 'ID del estado (relación con StateType)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El estado es requerido' })
  stateTypeId: number;
}

export class UpdateAccommodationDto {
  @ApiProperty({ example: 'CSA', description: 'Código del hospedaje' })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El código es requerido' })
  code?: string;

  @ApiProperty({ example: 'Cabaña Sur', description: 'Nombre del hospedaje' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Hospedaje con vista al lago',
    description: 'Descripción',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 4, description: 'Cantidad de personas permitidas' })
  @IsInt()
  @IsOptional()
  amountPerson?: number;

  @ApiProperty({ example: true, description: '¿Tiene jacuzzi?' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  jacuzzi?: boolean;

  @ApiProperty({ example: 2, description: 'Cantidad de habitaciones' })
  @IsInt()
  @IsOptional()
  amountRoom?: number;

  @ApiProperty({ example: 1, description: 'Cantidad de baños' })
  @IsInt()
  @IsOptional()
  amountBathroom?: number;

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
    example: 1,
    description: 'ID del tipo de categoría',
  })
  @IsNumber()
  @IsOptional()
  categoryTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de cama',
  })
  @IsNumber()
  @IsOptional()
  bedTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del estado del hospedaje',
  })
  @IsNumber()
  @IsOptional()
  stateTypeId?: number;
}

export class GetAcommodationDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: GET_ACCOMMODATION_EXAMPLE,
  })
  data: Accommodation;
}

export interface GetAllAccommodationsResponse {
  accommodations: Accommodation[];
}

export class GetAllAccommodationsResposeDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    example: GET_ALL_ACCOMMODATIONS_EXAMPLE,
  })
  data: GetAllAccommodationsResponse;
}
