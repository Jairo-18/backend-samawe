import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';
import { OrderConst } from '../constants/order.constants';
import { PageMetaDto } from './pageMeta.dto';

export class ParamsPaginationDto {
  @ApiPropertyOptional({ enum: OrderConst, default: OrderConst.ASC })
  @IsOptional()
  order?: OrderConst = OrderConst.ASC;

  @ApiProperty({
    type: Number,
    example: '1',
    default: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    type: Number,
    example: '10',
    required: false,
    default: 10,
  })
  @IsOptional()
  perPage?: number = 10;

  @ApiProperty({
    type: String,
    example: 'admin',
    required: false,
  })
  @IsOptional()
  search?: string;
}

export class ResponsePaginationDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty({ type: () => PageMetaDto })
  readonly pagination: PageMetaDto;

  constructor(data: T[], pagination: PageMetaDto) {
    this.data = data;
    this.pagination = pagination;
  }
}
