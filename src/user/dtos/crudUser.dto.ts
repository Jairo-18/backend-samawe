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
    example: 'Select usuario',
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
    example: 'Jheferson',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Checa',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: 'jheferson@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+57 codigo',
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
}

// export interface UserDataResponse {
//   userId: string;
//   identificationType: number;
//   identificationNumber: string;
//   roleId: number;
//   username: string;
//   email: string;
//   createdAt: Date;
//   phone: string;
//   avatarUrl: string;
// }
