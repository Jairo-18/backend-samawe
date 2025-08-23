import { GET_USER_EXAMPLE } from './../constants/examples.conts';
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
  IsBoolean,
} from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_USER_EXAMPLE } from '../constants/examples.conts';

export class CreateUserDto {
  @ApiProperty({
    example: 'Id de usuario - uuid',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: NOT_EMPTY_MESSAGE_ID })
  userId: string;

  @ApiProperty({
    example: 'Cédula de ciudadania / uuid',
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
    example: 'Jhon',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty({
    example: 'Legarda',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiProperty({
    example: 'test@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '1',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El prefijo es requerido' })
  phoneCode: string;

  @ApiProperty({
    example: '3102103660',
    required: true,
  })
  @IsNotEmpty({ message: 'El celular es requerido' })
  phone: string;

  @ApiProperty({
    example: 'Test@123',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({
    example: 'Test@123',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  confirmPassword: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el producto está activo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'UUID DEL ROL',
    description: 'Rol aignado / uuid',
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

export class GetUserResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: GET_USER_EXAMPLE,
  })
  data: Partial<User>;
}

export class UpdateUserDto {
  @ApiProperty({
    example: 'uuid-del-tipo-identificacion',
    required: false,
  })
  @IsOptional()
  @IsString()
  identificationType: string;

  @ApiProperty({ example: '1120066430' })
  @IsString()
  @IsOptional()
  identificationNumber: string;

  @ApiProperty({ example: 'Test Nombre' })
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiProperty({ example: 'Test Apellido' })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty({ example: 'test@gmail.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un correo válido' })
  email: string;

  @ApiProperty({ example: '2' })
  @IsOptional()
  @IsString()
  phoneCode: string;

  @ApiProperty({ example: '3102103660' })
  @IsString()
  @IsOptional()
  phone: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el producto está activo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: 'uuid-del-role',
    description: 'UUID del rol asignado',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del rol no es válido' })
  roleType: string;
}

export class ChangePasswordBaseDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '********',
  })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
  @ApiProperty({
    type: String,
    required: true,
    example: '********',
  })
  @IsString()
  @IsNotEmpty()
  confirmNewPassword: string;
}

export class RecoveryPasswordDto extends ChangePasswordBaseDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
  @ApiProperty({
    type: String,
    required: true,
    example: 'token',
  })
  @IsString()
  @IsNotEmpty()
  resetToken: string;
}

export class ChangePasswordDto extends ChangePasswordBaseDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '********',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;
}
