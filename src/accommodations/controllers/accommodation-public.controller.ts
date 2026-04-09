import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { AccommodationUC } from '../useCases/accommodationUC.uc';
import { CrudAccommodationUC } from '../useCases/crudAccommodationUC.uc';
import { ParamsPaginationDto } from '../../shared/dtos/pagination.dto';
import { ResponsePaginationDto } from '../../shared/dtos/pagination.dto';
import { AccommodationPublicListItem } from '../interface/accommodation.interface';

class AccommodationImageSwaggerDto {
  @ApiProperty({ example: 4 })
  accommodationImageId: number;

  @ApiProperty({ example: 'https://...' })
  imageUrl: string;

  @ApiProperty({ example: 'accommodations/uuid.webp' })
  publicId: string;
}

class AccommodationTypeSwaggerDto {
  @ApiProperty({ example: 13 })
  categoryTypeId?: number;

  @ApiProperty({ example: 3 })
  bedTypeId?: number;

  @ApiProperty({ example: 1 })
  stateTypeId?: number;

  @ApiProperty({ example: 'HOS' })
  code: string;

  @ApiProperty({ example: 'HOSPEDAJE' })
  name: string;
}

class MostRequestedAccommodationSwaggerDto {
  @ApiProperty({ example: 6 })
  accommodationId: number;

  @ApiProperty({ example: 'CAB1' })
  code: string;

  @ApiProperty({ example: 'CABAÑA 1' })
  name: string;

  @ApiProperty({ example: '' })
  description?: string;

  @ApiProperty({ example: 2 })
  amountPerson: number;

  @ApiProperty({ example: 1 })
  amountRoom: number;

  @ApiProperty({ example: 2 })
  amountBathroom: number;

  @ApiProperty({ example: false })
  jacuzzi: boolean;

  @ApiProperty({ example: '280000.00' })
  priceSale: number;

  @ApiProperty({ type: AccommodationTypeSwaggerDto, nullable: true })
  categoryType: AccommodationTypeSwaggerDto | null;

  @ApiProperty({ type: AccommodationTypeSwaggerDto, nullable: true })
  bedType: AccommodationTypeSwaggerDto | null;

  @ApiProperty({ type: AccommodationTypeSwaggerDto, nullable: true })
  stateType: AccommodationTypeSwaggerDto | null;

  @ApiProperty({ type: [AccommodationImageSwaggerDto] })
  images: AccommodationImageSwaggerDto[];

  @ApiProperty({ example: null, nullable: true })
  organizationalId: string | null;
}

class MostRequestedResponseSwaggerDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: [MostRequestedAccommodationSwaggerDto] })
  data: MostRequestedAccommodationSwaggerDto[];
}

@Controller('accommodation/public')
@ApiTags('Hospedajes Público')
export class AccommodationPublicController {
  constructor(
    private readonly _accommodationUC: AccommodationUC,
    private readonly _crudAccommodationUC: CrudAccommodationUC,
  ) {}

  @Get('most-requested')
  @ApiOperation({
    summary: 'Obtiene los 2 hospedajes más solicitados (acceso público)',
  })
  @ApiOkResponse({ type: MostRequestedResponseSwaggerDto })
  async getMostRequested(): Promise<MostRequestedResponseSwaggerDto> {
    const data = await this._accommodationUC.getMostRequested();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get('list')
  @ApiOperation({
    summary: 'Listado paginado de hospedajes para el homepage (acceso público)',
  })
  @ApiOkResponse({ description: 'Listado paginado de hospedajes' })
  async getPublicList(
    @Query() params: ParamsPaginationDto,
  ): Promise<ResponsePaginationDto<AccommodationPublicListItem>> {
    return this._crudAccommodationUC.paginatedPublicList(params);
  }
}
