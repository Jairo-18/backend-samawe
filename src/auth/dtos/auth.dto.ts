import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: String,
    description: 'Email',
    example: 'test@gmail.com',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    type: String,
    description: 'Contraseña',
    example: 'Test@123',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class RefreshTokenBodyDto {
  @ApiProperty({
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class SignOutBodyDto {
  @ApiProperty({
    example: '7985544c-4659-49f3-8d1c-42602a1c765b',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
  @ApiProperty({
    example: '75394f7c-429f-4f07-9f9e-9214eae0b398',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  accessSessionId: string;
}

export interface RoleType {
  roleTypeId: string;
  name: string;
}

export interface SignInResponse {
  tokens: { accessToken: string; refreshToken: string };
  user: { userId: string; roleType: RoleType };
}

export class SignInResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: String,
    example: 'Bienvenid@',
  })
  message: string;

  data: AuthTokenResponseDto;
}

export class InvalidAccessDataResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.UNAUTHORIZED,
  })
  statusCode: number;

  //data: AuthTokenResponseDto;
}

export class AuthTokenResponseDto {
  @ApiProperty({
    example: {
      accessToken: 'access-token-example',
      refreshToken: 'refresh-token-example',
    },
  })
  tokens: {
    accessToken: string;
    refreshToken: string;
  };

  @ApiProperty({
    example: {
      user: {
        userId: '53ec2766-ea95-4dab-ad9a--4dab-ad9a',
      },
      roleType: {
        roleTypeId: '53ec2766-ea95-4dab-ad9a-',
        name: 'Clientes',
      },
    },
  })
  user: {
    userId: string;
    roleType: {
      roleTypeId: string;
      name: string;
    };
  };

  @ApiProperty({
    type: String,
    required: false,
    example: '75394f7c-429f-4f07-9f9e-9214eae0b398',
  })
  @IsOptional()
  accessSessionId?: string;
}

export class RefreshTokenResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: {
      tokens: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpoZWZmIiwic3ViIjoiNTNlYzI3NjYtZWE5NS00ZGFiLWFkOWEtZDFjYmY1Y2EzY2JlIiwiaWQiOiI1M2VjMjc2Ni1lYTk1LTRkYWItYWQ5YS1kMWNiZjVjYTNjYmUiLCJpYXQiOjE3NDIxNjQxODUsImV4cCI6MTc0MjIwMDE4NX0.4YGuGi6jiH9NCpQIsZV6RTQxuQ9Sg57sphciWAWkIsY',
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpoZWZmIiwic3ViIjoiNTNlYzI3NjYtZWE5NS00ZGFiLWFkOWEtZDFjYmY1Y2EzY2JlIiwiaWQiOiI1M2VjMjc2Ni1lYTk1LTRkYWItYWQ5YS1kMWNiZjVjYTNjYmUiLCJpYXQiOjE3NDIxNjQxODUsImV4cCI6MTc0Mjc2ODk4NX0.Ow3FAW_pm60V4qf73aA8JN4P0qJCqDTJ7EEOQX5VeYQ',
      },
      user: {
        userId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vyb',
        roleType: {
          roleTypeId: 'eyJhbGUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vyb',
          name: 'Clientes',
        },
      },
    },
  })
  data: SignInResponse;
}

export class SignOutResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: String,
    example: 'Logged out successfully',
  })
  message?: string;
}

export class RecoveryPasswordBodyDto {
  @ApiProperty({ example: 'jhonlegarda1.2@gmail.com', required: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
