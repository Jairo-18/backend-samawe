import { CrudExcursionUC } from './../useCases/crudExcursionUC.uc';
import {
  CreateExcursionDto,
  GetAllExcursionsResposeDto,
  GetExcursionDto,
  UpdateExcursionDto,
} from './../dtos/excursion.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { ExcursionUC } from './../useCases/excursionUC.uc';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateExcursionRelatedDataReponseDto } from '../dtos/crudExcursion.dto';

@Controller('excursion')
@ApiTags('Pasadías')
export class ExcursionController {
  constructor(
    private readonly _excursionUC: ExcursionUC,
    private readonly _crudExcursionUC: CrudExcursionUC,
  ) {}

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateExcursionDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() excursionDto: CreateExcursionDto,
  ): Promise<CreatedRecordResponseDto> {
    const createExcursion = await this._excursionUC.create(excursionDto);

    return {
      message: 'Registro de pasadía exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createExcursion.excursionId.toString(),
        ...createExcursion,
      },
    };
  }

  @Get('/create/related-data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateExcursionRelatedDataReponseDto })
  async getRelatedData(): Promise<CreateExcursionRelatedDataReponseDto> {
    const data = await this._crudExcursionUC.getRelatedDataToCreate();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllExcursionsResposeDto })
  async findAll(): Promise<GetAllExcursionsResposeDto> {
    const accommodations = await this._excursionUC.findAll();
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
    @Param('id') excursionId: string,
    @Body() excursionData: UpdateExcursionDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._excursionUC.update(excursionId, excursionData);

    return {
      message: 'Pasadía actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetExcursionDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async findOne(@Param('id') excursionId: string): Promise<GetExcursionDto> {
    const excursion = await this._excursionUC.findOne(excursionId);
    return {
      statusCode: HttpStatus.OK,
      data: excursion,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(
    @Param('id') excursionId: string,
  ): Promise<DeleteReCordResponseDto> {
    await this._excursionUC.delete(excursionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Pasadía eliminada exitosamente',
    };
  }
}
