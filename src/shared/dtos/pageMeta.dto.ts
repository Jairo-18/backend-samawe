import { ApiProperty } from '@nestjs/swagger';
import { ParamsPaginationDto } from './pagination.dto';

export interface PageMetaParametersDto {
  pageOptionsDto: ParamsPaginationDto;
  itemCount: number;
}

export class PageMetaDto {
  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly perPage: number;

  @ApiProperty()
  readonly total: number;

  @ApiProperty()
  readonly pageCount: number;

  @ApiProperty()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: PageMetaParametersDto) {
    this.page = pageOptionsDto.page;
    this.perPage = pageOptionsDto.perPage;
    this.total = itemCount;
    this.pageCount = Math.ceil(this.total / this.perPage);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
