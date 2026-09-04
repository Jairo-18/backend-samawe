import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
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
import {
  AccommodationOccupiedRange,
  AccommodationPublicDetail,
  AccommodationPublicListItem,
} from '../interface/accommodation.interface';

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

  @ApiProperty({ example: { es: 'Hospedaje', en: 'Lodging' } })
  name: Record<string, string>;
}

class MostRequestedAccommodationSwaggerDto {
  @ApiProperty({ example: 6 })
  accommodationId: number;

  @ApiProperty({ example: 'CAB1' })
  code: string;

  @ApiProperty({ example: { es: 'CABAÑA 1' } })
  name: Record<string, string>;

  @ApiProperty({ example: { es: '' } })
  description?: Record<string, string>;

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
  async getMostRequested(
    @Query('organizationalId') organizationalId?: string,
  ): Promise<MostRequestedResponseSwaggerDto> {
    const data = await this._accommodationUC.getMostRequested(organizationalId);
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

  /**
   * Tramos ocupados para el calendario de la ficha. Devuelve solo fechas.
   * Se declara ANTES de ':id' porque Nest resuelve por orden y una ruta más
   * específica declarada después nunca se alcanzaría.
   */
  @Get(':id/availability')
  @ApiOperation({
    summary: 'Fechas ocupadas de un hospedaje (acceso público)',
  })
  @ApiOkResponse({ description: 'Tramos ocupados, intervalos semiabiertos' })
  async getPublicAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('months') months?: string,
  ): Promise<{ statusCode: number; data: AccommodationOccupiedRange[] }> {
    // Ventana acotada: sin tope, un `months` enorme haría escanear todo el
    // histórico de detalles en un endpoint sin autenticación.
    const parsed = Number(months);
    const window = Number.isFinite(parsed)
      ? Math.min(Math.max(Math.trunc(parsed), 1), 24)
      : 12;

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setMonth(to.getMonth() + window);

    const data = await this._crudAccommodationUC.publicOccupiedRanges(
      id,
      from,
      to,
    );
    return { statusCode: HttpStatus.OK, data };
  }

  /**
   * Ficha de un hospedaje, sin autenticación: es una página indexable por
   * Google. Va la última del controlador para que 'most-requested' y 'list' no
   * caigan en el comodín ':id'.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un hospedaje (acceso público)' })
  @ApiOkResponse({ description: 'Datos públicos del hospedaje' })
  async getPublicDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ statusCode: number; data: AccommodationPublicDetail }> {
    const data = await this._crudAccommodationUC.publicDetail(id);
    return { statusCode: HttpStatus.OK, data };
  }
}
