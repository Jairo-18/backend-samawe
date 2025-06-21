import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { RoleType } from '../../shared/entities/roleType.entity';
import { IdentificationType } from './../../shared/entities/identificationType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ParamsPaginationDto } from 'src/shared/dtos/pagination.dto';

export interface CreateUserRelatedDataDto {
  roleType?: RoleType[];
  identificationType: IdentificationType[];
  phoneCode: PhoneCode[];
}

export class CreateUserRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Data relacionada para creación y registro del usuario',
  })
  data: CreateUserRelatedDataDto;
}

export class PaginatedListUsersParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Cédula de ciudadania',
    description: 'Nombre del tipo de identificación',
    required: false,
  })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @ApiProperty({
    example: '1120066430',
    required: false,
  })
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @ApiProperty({
    example: 'Jhon',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Legarda',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: 'test@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+57 Colombia',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneCode?: string;

  @ApiProperty({
    example: '3102103660',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'uuid-del-rol',
    description: 'UUID del rol',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roleType?: string;

  @ApiProperty({
    example: false,
    description: 'Boolean',
    required: false,
  })
  @IsOptional()
  @IsString()
  isActive?: boolean;
}

export class PaginatedUserSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Jhon',
    description: 'Buscar por nombre, apellido o identificación',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PartialUserDto {
  @ApiProperty({
    example: 'Jhon',
    description: 'Nombre del usuario',
  })
  firstName: string;

  @ApiProperty({
    example: 'Legarda',
    description: 'Apellido del usuario',
  })
  lastName: string;

  @ApiProperty({
    example: '1120066430',
    description: 'Número de identificación del usuario',
  })
  identificationNumber: string;
}
