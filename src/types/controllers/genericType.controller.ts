import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { GenericTypeUC } from '../useCases/genericType.uc';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  NotFoundException,
  UseGuards,
  HttpStatus,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateTypeDto,
  GetTypeByIdResponseDto,
  ParamsPaginationGenericDto,
  UpdateTypeDto,
} from '../dtos/genericType.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('type')
@ApiTags('Tipos')
export class GenericTypeController {
  constructor(
    private readonly repoService: RepositoryService,
    private readonly genericTypeUC: GenericTypeUC<any>,
  ) {}

  private validateTypeExists(type: string): void {
    const repository = this.repoService.repositories[type];
    if (!repository) {
      throw new NotFoundException(`Tipo "${type}" no válido`);
    }
  }

  @Get('paginated/:type')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: ResponsePaginationDto })
  async paginatedListByType(
    @Param('type') type: string,
    @Query() params: ParamsPaginationGenericDto,
  ): Promise<ResponsePaginationDto<any>> {
    this.validateTypeExists(type);
    return await this.genericTypeUC.paginatedList(params, type);
  }

  @Post('create/:type')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Param('type') type: string,
    @Body() createTypeDto: CreateTypeDto,
  ): Promise<CreatedRecordResponseDto> {
    this.validateTypeExists(type);

    const rowId = await this.genericTypeUC.createWithValidationAndGetId(
      type,
      createTypeDto,
    );

    return {
      message: `Registro exitoso`,
      statusCode: HttpStatus.CREATED,
      data: { rowId },
    };
  }

  // GET all additional types
  @Get('additionalType/all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ description: 'Lista completa de AdditionalType' })
  async getAllAdditionalTypes() {
    const result = await this.genericTypeUC.getAll('additionalType');
    return {
      statusCode: HttpStatus.OK,

      data: result,
    };
  }

  // GET all discount types
  @Get('discountType/all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ description: 'Lista completa de DiscountType' })
  async getAllDiscountTypes() {
    const result = await this.genericTypeUC.getAll('discountType');
    return {
      statusCode: HttpStatus.OK,

      data: result,
    };
  }

  @Get(':type/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetTypeByIdResponseDto })
  async findOneByTypeAndId(
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<GetTypeByIdResponseDto> {
    this.validateTypeExists(type);

    const result = await this.genericTypeUC.findOneByTypeAndId(type, id);

    return {
      statusCode: HttpStatus.OK,
      data: { type: result },
    };
  }

  @Patch(':type/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UpdateRecordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() updateTypeDto: UpdateTypeDto,
  ): Promise<UpdateRecordResponseDto> {
    this.validateTypeExists(type);

    await this.genericTypeUC.update(type, id, updateTypeDto);

    return {
      message: 'Registro actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':type/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<DeleteReCordResponseDto> {
    this.validateTypeExists(type);

    await this.genericTypeUC.delete(type, id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Registro eliminado exitosamente',
    };
  }
}
