import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreateRelatedDataServicesAndProductsResponseDto,
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
  PartialAccommodationDto,
} from './../dtos/crudAccommodation.dto';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { CrudAccommodationUC } from '../useCases/crudAccommodationUC.uc';
import {
  DuplicatedResponseDto,
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import {
  CreateAccommodationDto,
  GetAcommodationDto,
  GetAllAccommodationsResposeDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
import { AccommodationUC } from './../useCases/accommodationUC.uc';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccommodationInterfacePaginatedList } from '../interface/accommodation.interface';

@Controller('accommodation')
@ApiTags('Hospedajes')
export class AccommodationController {
  constructor(
    private readonly _accommodationUC: AccommodationUC,
    private readonly _crudAccommodationUC: CrudAccommodationUC,
  ) {}

  @Get('/paginated-partial')
  @ApiOkResponse({ type: ResponsePaginationDto<PartialAccommodationDto> })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedPartial(
    @Query() params: PaginatedAccommodationSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialAccommodationDto>> {
    return this._crudAccommodationUC.paginatedPartialAccommodation(params);
  }

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateAccommodationDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() accommodationDto: CreateAccommodationDto,
  ): Promise<CreatedRecordResponseDto> {
    const createAccommodation =
      await this._accommodationUC.create(accommodationDto);

    return {
      message: 'Registro de hospedaje exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createAccommodation.accommodationId.toString(),
        ...createAccommodation,
      },
    };
  }

  @Get('/create/related-data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateRelatedDataServicesAndProductsResponseDto })
  async getRelatedData(): Promise<CreateRelatedDataServicesAndProductsResponseDto> {
    const data = await this._crudAccommodationUC.getRelatedDataToCreate();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllAccommodationsResposeDto })
  async findAll(): Promise<GetAllAccommodationsResposeDto> {
    const accommodations = await this._accommodationUC.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: { accommodations },
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UpdateRecordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async update(
    @Param('id') accommodationId: string,
    @Body() accommodationData: UpdateAccommodationDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._accommodationUC.update(accommodationId, accommodationData);

    return {
      message: 'Hospedaje actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/paginated-list')
  @ApiOkResponse({ type: ResponsePaginationDto<Accommodation> })
  // @ApiBearerAuth()
  // @UseGuards(AuthGuard())
  async getPaginatedList(
    @Query() params: PaginatedListAccommodationsParamsDto,
  ): Promise<ResponsePaginationDto<AccommodationInterfacePaginatedList>> {
    return await this._crudAccommodationUC.paginatedList(params);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAcommodationDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async findOne(
    @Param('id') accommodationId: string,
  ): Promise<GetAcommodationDto> {
    const accommodation = await this._accommodationUC.findOne(accommodationId);
    return {
      statusCode: HttpStatus.OK,
      data: accommodation,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(
    @Param('id') accommodationId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._accommodationUC.delete(accommodationId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Hospedaje eliminado exitosamente',
    };
  }
}
