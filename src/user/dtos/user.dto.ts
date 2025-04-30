import { User } from './../../shared/entities/user.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { NOT_EMPTY_MESSAGE_ID } from './../../shared/constants/validator-messages.const';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_USER_EXAMPLE } from '../constants/examples.conts';

export class CreateUserDto {
  @ApiProperty({
    example: 'uuid',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: NOT_EMPTY_MESSAGE_ID })
  userId: string;

  @ApiProperty({
    example: 'Cédula de ciudadania',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de identificación es requerido' })
  identificationType: string;

  @ApiProperty({
    example: '1120066430',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de identificación es requerido' })
  identificationNumber: string;

  @ApiProperty({
    example: 'Jheferson',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty({
    example: 'Checa',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiProperty({
    example: 'jheferson@gmail.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    example: '3102103660',
    required: true,
  })
  @IsNotEmpty({ message: 'El celular es requerido' })
  phone: string;

  @ApiProperty({
    example: '123456',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({
    example: '123456',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  confirmPassword: string;

  @ApiProperty({
    example: '',
    description: 'UUID del rol asignado',
    required: false,
  })
  @ValidateIf((o) => o.roleType && o.roleType.trim() !== '')
  @IsUUID()
  @IsOptional()
  roleType?: string;
}

export interface GetAllUsersRespose {
  users: User[];
}

export class GetAllUsersResposeDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Array,
    example: GET_ALL_USER_EXAMPLE,
  })
  data: GetAllUsersRespose;
}

export class GetUserDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: GET_ALL_USER_EXAMPLE,
  })
  data: User;
}

export class UpdateUserDto {
  @ApiProperty({
    example: 'Cédula de ciudadania',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de identificación es requerido' })
  identificationType: string;

  @ApiProperty({ example: '1120066430' })
  @IsString()
  @IsNotEmpty({ message: 'El número de identificación es requerido' })
  identificationNumber: string;

  @ApiProperty({ example: 'Test' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty({ example: 'Test Apellido' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiProperty({ example: 'test@gmail.com' })
  @IsString()
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({ example: '3102103660' })
  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  phone: string;

  @ApiProperty({
    example: '',
    description: 'UUID del rol asignado',
    required: false,
  })
  @ValidateIf((o) => o.RoleType && o.RoleType.trim() !== '')
  @IsUUID()
  @IsOptional()
  RoleType?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'passwordOld',
    required: true,
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword',
    required: true,
  })
  @IsString()
  newPassword: string;
}
