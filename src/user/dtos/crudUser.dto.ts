import { RoleType } from '../../shared/entities/roleType.entity';
import { IdentificationType } from './../../shared/entities/identificationType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

export interface CreateUserRelatedDataDto {
  roleType?: RoleType[];
  identificationType: IdentificationType[];
}

export class CreateUserRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos de select',
  })
  data: CreateUserRelatedDataDto;
}
