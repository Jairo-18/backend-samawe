import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
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
import { ApiTags } from '@nestjs/swagger';
import {
  PaginatedListByTypeDocs,
  CreateTypeDocs,
  FindOneByTypeAndIdDocs,
  UpdateTypeDocs,
  DeleteTypeDocs,
  GetAllByTypeDocs,
} from '../decorators/genericType.decorators';
import {
  CreateTypeDto,
  GetTypeByIdResponseDto,
  ParamsPaginationGenericDto,
  UpdateTypeDto,
} from '../dtos/genericType.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@Controller('type')
@ApiTags('Tipos')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
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
  @PaginatedListByTypeDocs()
  async paginatedListByType(
    @Param('type') type: string,
    @Query() params: ParamsPaginationGenericDto,
  ): Promise<ResponsePaginationDto<any>> {
    this.validateTypeExists(type);
    return await this.genericTypeUC.paginatedList(params, type);
  }

  @Post('create/:type')
  @CreateTypeDocs()
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

  @Get(':type/all')
  @GetAllByTypeDocs()
  async getAllByType(@Param('type') type: string) {
    this.validateTypeExists(type);
    const result = await this.genericTypeUC.getAll(type);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get(':type/:id')
  @FindOneByTypeAndIdDocs()
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
  @UpdateTypeDocs()
  async update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() updateTypeDto: UpdateTypeDto,
  ): Promise<UpdateRecordResponseDto> {
    this.validateTypeExists(type);

    await this.genericTypeUC.update(type, id, updateTypeDto);

    return {
      message: 'api.types.updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':type/:id')
  @DeleteTypeDocs()
  async delete(
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<DeleteReCordResponseDto> {
    this.validateTypeExists(type);

    await this.genericTypeUC.delete(type, id);

    return {
      statusCode: HttpStatus.OK,
      message: 'api.types.deleted',
    };
  }
}
