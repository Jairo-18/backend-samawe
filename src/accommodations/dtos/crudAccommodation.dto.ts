import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { BedType } from './../../shared/entities/bedType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { HttpStatus } from '@nestjs/common';

export interface CreateAccommodationRelatedDataDto {
  stateType?: StateType[];
  categoryType: CategoryType[];
  bedType: BedType[];
}

export class CreateAccommodationRelatedDataReponseDto
  implements BaseResponseDto
{
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos relacionados con hospedaje',
  })
  data: CreateAccommodationRelatedDataDto;
}
