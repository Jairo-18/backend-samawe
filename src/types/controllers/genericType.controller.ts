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
  ForbiddenException,
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
import { GetUser } from '../../shared/decorators/user.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

const STAFF_ROLES = [RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP];

/**
 * Catálogos que cualquier usuario autenticado puede leer en `GET :type/all`.
 * Son datos públicos del DANE que el cliente necesita para completar su propio
 * perfil (departamento y municipio). El resto de tipos —roles, tipos de factura,
 * etc.— sigue restringido al personal.
 */
const PUBLIC_CATALOG_TYPES = ['department', 'municipality'];

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
  // Se abre a todos los roles y la restricción se aplica abajo por tipo: los
  // catálogos DANE los necesita el propio cliente (rol USER) para editar su
  // perfil, pero el resto de tipos debe seguir siendo solo del personal.
  @Roles(
    RolesUser.SUPERADMIN,
    RolesUser.ADMIN,
    RolesUser.EMP,
    RolesUser.PRO,
    RolesUser.CHE,
    RolesUser.MES,
    RolesUser.USER,
  )
  @GetAllByTypeDocs()
  async getAllByType(@Param('type') type: string, @GetUser() user: any) {
    this.validateTypeExists(type);

    const isStaff = STAFF_ROLES.includes(user?.roleType?.code);
    if (!isStaff && !PUBLIC_CATALOG_TYPES.includes(type)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }

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
