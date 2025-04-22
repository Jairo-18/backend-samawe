import { User } from './../../shared/entities/user.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { NOT_EMPTY_MESSAGE_ID } from './../../shared/constants/validator-messages.const';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsUUID } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_USER_EXAMPLE } from '../constants/examples.conts';

export class CreateUserDto {
  @ApiProperty({
    example: 'uuid',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: NOT_EMPTY_MESSAGE_ID })
  id: string;

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
    example: 'f50a0b3c-d091-4e56-a1f1-3bdb64cf1229',
    description: 'UUID del rol asignado',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: string;
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
  @ApiProperty({ example: 'Jheferson' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty({ example: 'Checa' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiProperty({ example: '3102103660' })
  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  phone: string;

  @ApiProperty({ example: '1120066430' })
  @IsString()
  @IsNotEmpty({ message: 'El número de identificación es requerido' })
  identificationNumber: string;

  @ApiProperty({
    example: 'f50a0b3c-d091-4e56-a1f1-3bdb64cf1229',
    description: 'UUID del rol asignado',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'El rol es requerido' })
  roleId: string;
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
