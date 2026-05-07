import { BaseResponseDto } from '../../shared/dtos/response.dto';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_TYPES_EXAMPLE } from '../constants/examplesTypes.conts';
import { ParamsPaginationDto } from 'src/shared/dtos/pagination.dto';
import { Type } from 'class-transformer';

export class CreateTypeDto {
  @ApiProperty({ example: 'Ingresa un prefijo' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: { es: 'Alojamiento', en: 'Accommodation' } })
  @IsObject()
  @IsNotEmpty()
  name: Record<string, string>;
}

export interface Type {
  typeId: number;
  code: string;
  name: string;
}

export interface GetAllTypesResponse {
  [key: string]: Type[];
}

export class GetTypeByIdResponseDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Objeto del tipo solicitado',
    example: {
      type: {
        phoneCodeId: 4,
        name: 'Argentina',
        code: '+54',
      },
    },
  })
  data: {
    type: any;
  };
}

export class GetAllTypesResponseDto implements BaseResponseDto {
  @ApiProperty({ example: HttpStatus.OK })
  statusCode: number;

  @ApiProperty({
    example: GET_ALL_TYPES_EXAMPLE,
  })
  data: Record<string, Type[]>;
}

export class UpdateTypeDto {
  @ApiProperty({ example: 'Ingresa un prefijo' })
  @IsString()
  @IsOptional()
  code: string;

  @ApiProperty({ example: { es: 'Alojamiento', en: 'Accommodation' }, required: false })
  @IsObject()
  @IsOptional()
  name?: Record<string, string>;
}

export class ParamsPaginationGenericDto extends ParamsPaginationDto {
  @ApiProperty({
    description: 'Campo por el cual ordenar',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({
    example: 'CC-12',
    description: 'Código de tipo',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Cédula de ciudadania',
    description: 'Nombre del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
