import { BaseResponseDto } from './../../shared/dtos/response.dto';
// dto/create-type.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_TYPES_EXAMPLE } from '../constants/examplesTypes.conts';

export class CreateTypeDto {
  @ApiProperty({ example: 'Ingresa un prefijo' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Ingresa el nombre' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export interface Type {
  typeId: number;
  code: string;
  name: string;
}

export interface GetAllTypesResponse {
  [key: string]: Type[];
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

  @ApiProperty({ example: 'Ingresa el nombre' })
  @IsString()
  @IsOptional()
  name: string;
}
