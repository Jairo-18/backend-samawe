import { Role } from './../../shared/entities/role.entity';
import { identificationType } from './../../shared/entities/identificationType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

export interface CreateUserRelatedDataDto {
  role?: Role[];
  identificationType: identificationType[];
}

export class CreateUserRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: '',
  })
  data: CreateUserRelatedDataDto;
}
