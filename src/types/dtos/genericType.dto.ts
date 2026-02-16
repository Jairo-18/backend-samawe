import { BaseResponseDto } from '../../shared/dtos/response.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ example: 'Ingresa el nombre' })
  @IsString()
  @IsOptional()
  name: string;
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

// export class MultipleTypesPaginationDto {
//   @ApiProperty({
//     description: 'Array de tipos a consultar',
//     example: ['roleType', 'phoneCode', 'payType'],
//     required: false,
//   })
//   @IsOptional()
//   @IsArray()
//   @Transform(({ value }) => {
//     if (typeof value === 'string') {
//       return value.split(',').map((type) => type.trim());
//     }
//     return value;
//   })
//   types?: string[];

//   @ApiProperty({
//     description: 'Parámetros de paginación comunes',
//     type: ParamsPaginationGenericDto,
//   })
//   @ValidateNested()
//   @Type(() => ParamsPaginationGenericDto)
//   pagination: ParamsPaginationGenericDto;
// }

// export interface MultiplePaginatedResponse {
//   [typeName: string]: ResponsePaginationDto<any>;
// }

// export class MultiplePaginatedResponseDto implements BaseResponseDto {
//   @ApiProperty({ example: HttpStatus.OK })
//   statusCode: number;

//   @ApiProperty({
//     description: 'Objeto con las respuestas paginadas por tipo',
//     example: {
//       roleType: {
//         data: [
//           /* array de items */
//         ],
//         meta: {
//           /* metadata de paginación */
//         },
//       },
//       phoneCode: {
//         data: [
//           /* array de items */
//         ],
//         meta: {
//           /* metadata de paginación */
//         },
//       },
//     },
//   })
//   data: MultiplePaginatedResponse;

//   @ApiProperty({
//     description: 'Mensaje descriptivo',
//     example: 'Consulta exitosa de múltiples tipos',
//   })
//   message: string;
// }
