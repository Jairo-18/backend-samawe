import { TaxeType } from './../../shared/entities/taxeType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '../models/product.model';

export interface CreateProductRelatedDataDto {
  taxeType?: TaxeType[];
  categoryType: CategoryType[];
}

export class CreateProductRelatedDataReponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos de producto',
  })
  data: CreateProductRelatedDataDto;
}
