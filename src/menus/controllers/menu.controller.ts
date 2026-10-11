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
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuUC } from '../useCases/menuUC.uc';
import {
  CreateMenuDto,
  UpdateMenuDto,
  PaginatedMenuParamsDto,
} from '../dtos/menu.dto';
import {
  CreateMenuDocs,
  UpdateMenuDocs,
  GetPaginatedMenuDocs,
  FindOneMenuDocs,
  DeleteMenuDocs,
  RemoveProductFromMenuDocs,
} from '../decorators/menu.decorators';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { TenantContext } from '../../tenant/tenant-context.service';
import { OwnedBy } from '../../tenant/owned-by';
import { Menu } from '../../shared/entities/menu.entity';
import { Product } from '../../shared/entities/product.entity';

@Controller('menus')
@ApiTags('Menús')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
)
export class MenuController {
  constructor(
    private readonly _tenant: TenantContext,
    private readonly _menuUC: MenuUC,
  ) {}

  @Post()
  @CreateMenuDocs()
  async create(@Body() createDto: CreateMenuDto) {
    const menu = await this._menuUC.create(createDto);
    return {
      message: 'api.menu.created',
      statusCode: HttpStatus.CREATED,
      data: menu,
    };
  }

  @OwnedBy({ entity: Menu, param: 'id' })
  @Patch(':id')
  @UpdateMenuDocs()
  async update(@Param('id') menuId: string, @Body() updateDto: UpdateMenuDto) {
    const menu = await this._menuUC.update(parseInt(menuId), updateDto);
    return {
      message: 'api.menu.updated',
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

  @Get('paginated')
  @GetPaginatedMenuDocs()
  async findAllPaginated(@Query() params: PaginatedMenuParamsDto) {
    // La organización la decide el servidor (sesión), nunca el cliente: sin
    // esto, un listado sin `organizationalId` devolvía los de todos los hoteles.
    params.organizationalId = this._tenant.requireOrganizationalId();
    return await this._menuUC.findAllPaginated(params);
  }

  @OwnedBy({ entity: Menu, param: 'id' })
  @Get(':id')
  @FindOneMenuDocs()
  async findById(@Param('id') menuId: string) {
    const menu = await this._menuUC.findById(parseInt(menuId));
    return {
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

  @OwnedBy(
    { entity: Menu, param: 'id' },
    { entity: Product, param: 'productId' },
  )
  @Delete(':id/product/:productId')
  @RemoveProductFromMenuDocs()
  async removeProduct(
    @Param('id') menuId: string,
    @Param('productId') productId: string,
  ) {
    const menu = await this._menuUC.removeProductFromMenu(
      parseInt(menuId),
      parseInt(productId),
    );
    return {
      message: 'api.menu.dish_removed',
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

  @OwnedBy({ entity: Menu, param: 'id' })
  @Delete(':id')
  @DeleteMenuDocs()
  async delete(@Param('id') menuId: string) {
    await this._menuUC.delete(parseInt(menuId));
    return {
      message: 'api.menu.deleted',
      statusCode: HttpStatus.OK,
    };
  }
}
