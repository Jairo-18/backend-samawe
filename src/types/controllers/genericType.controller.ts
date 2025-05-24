import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { GenericTypeService } from './../services/genericType.service';
import { GenericTypeUC } from '../useCases/genericType.uc';
import { RepositoryService } from '../../shared/services/repositoriry.service';
// controllers/generic-type.controller.ts
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
  GetAllTypesResponseDto,
  ParamsPaginationGenericDto,
  Type,
  UpdateTypeDto,
} from '../dtos/genericType.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('type')
@ApiTags('Tipos')
export class GenericTypeController {
  constructor(private readonly repoService: RepositoryService) {}

  private getUseCase<T extends object>(type: string): GenericTypeUC<T> {
    const repository = this.repoService.repositories[type];
    if (!repository) throw new NotFoundException(`Tipo "${type}" no válido`);
    const service = new GenericTypeService<T>(repository, this.repoService);
    return new GenericTypeUC<T>(service);
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
    const rowId = await this.getUseCase(type).createWithValidation(
      type,
      createTypeDto,
    );

    return {
      message: `Registro exitoso`,
      statusCode: HttpStatus.CREATED,
      data: {
        rowId,
      },
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllTypesResponseDto })
  async findAllTypes(): Promise<GetAllTypesResponseDto> {
    const types = await GenericTypeService.findAllTypesFromRepositories(
      this.repoService.repositories,
      this.repoService,
    );

    return {
      statusCode: HttpStatus.OK,
      data: types,
    };
  }

  @Get(':type')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllTypesResponseDto })
  async findAll(@Param('type') type: string): Promise<GetAllTypesResponseDto> {
    const types = await this.getUseCase(type).findAll();
    return {
      statusCode: HttpStatus.OK,
      data: {
        types: types as Type[],
      },
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
    await this.getUseCase(type).update(id, updateTypeDto);
    return {
      message: 'Registro actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':type/paginated')
  @ApiOkResponse({ type: ResponsePaginationDto })
  // @ApiBearerAuth()
  // @UseGuards(AuthGuard())
  async paginatedList(
    @Param('type') type: string,
    @Query() params: ParamsPaginationGenericDto,
  ): Promise<ResponsePaginationDto<any>> {
    return await this.getUseCase(type).paginatedList(params, type);
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
    await this.getUseCase(type).delete(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Registro eliminado exitosamente',
    };
  }
}
