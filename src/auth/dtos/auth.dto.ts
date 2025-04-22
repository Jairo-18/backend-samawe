import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Role } from 'src/user/models/user.model';

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
    example: 'password',
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
}

export interface SignInResponse {
  tokens: { accessToken: string; refreshToken: string };
  user: { id: string; role: Role };
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
        id: '53ec2766-ea95-4dab-ad9a-d1cbf5ca3cbe',
        role: { id: 'user', name: 'Usuario' },
      },
    },
  })
  data: SignInResponse;
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
        id: '53ec2766-ea95-4dab-ad9a-d1cbf5ca3cbe',
        role: 'user',
      },
    },
  })
  data: SignInResponse;
}
