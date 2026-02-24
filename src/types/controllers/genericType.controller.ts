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
  GetAllAdditionalTypesDocs,
  GetAllDiscountTypesDocs,
  FindOneByTypeAndIdDocs,
  UpdateTypeDocs,
  DeleteTypeDocs,
} from '../decorators/genericType.decorators';
import {
  CreateTypeDto,
  GetTypeByIdResponseDto,
  ParamsPaginationGenericDto,
  UpdateTypeDto,
} from '../dtos/genericType.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('type')
@ApiTags('Tipos')
@UseGuards(AuthGuard())
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

  @Get('additionalType/all')
  @GetAllAdditionalTypesDocs()
  async getAllAdditionalTypes() {
    const result = await this.genericTypeUC.getAll('additionalType');
    return {
      statusCode: HttpStatus.OK,

      data: result,
    };
  }

  @Get('discountType/all')
  @GetAllDiscountTypesDocs()
  async getAllDiscountTypes() {
    const result = await this.genericTypeUC.getAll('discountType');
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
      message: 'Registro actualizado correctamente',
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
      message: 'Registro eliminado exitosamente',
    };
  }
}
