import { User } from './../../shared/entities/user.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { NOT_EMPTY_MESSAGE_ID } from './../../shared/constants/validator-messages.const';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { GET_ALL_USER_EXAMPLE } from '../constants/examples.conts';

export class UserDto {
  @ApiProperty({
    example: 'uuid',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: NOT_EMPTY_MESSAGE_ID })
  id: string;

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
    example: 'Jheff',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  username: string;

  @ApiProperty({
    example: 'Admin',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerido' })
  password: string;
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
