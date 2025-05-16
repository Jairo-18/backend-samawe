import { StateType } from './../../shared/entities/stateType.entity';
import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from 'src/products/models/product.model';

export interface CreateExcursionRelatedDataDto {
  stateType?: StateType[];
  categoryType: CategoryType[];
}

export class CreateExcursionRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos relacionados con pasadía',
  })
  data: CreateExcursionRelatedDataDto;
}
