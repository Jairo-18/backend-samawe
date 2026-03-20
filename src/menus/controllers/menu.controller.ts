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

@Controller('menus')
@ApiTags('Menús')
@UseGuards(AuthGuard())
export class MenuController {
  constructor(private readonly _menuUC: MenuUC) {}

  @Post()
  @CreateMenuDocs()
  async create(@Body() createDto: CreateMenuDto) {
    const menu = await this._menuUC.create(createDto);
    return {
      message: 'Menú creado exitosamente',
      statusCode: HttpStatus.CREATED,
      data: menu,
    };
  }

  @Patch(':id')
  @UpdateMenuDocs()
  async update(@Param('id') menuId: string, @Body() updateDto: UpdateMenuDto) {
    const menu = await this._menuUC.update(parseInt(menuId), updateDto);
    return {
      message: 'Menú actualizado exitosamente',
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

  @Get('paginated')
  @GetPaginatedMenuDocs()
  async findAllPaginated(@Query() params: PaginatedMenuParamsDto) {
    return await this._menuUC.findAllPaginated(params);
  }

  @Get(':id')
  @FindOneMenuDocs()
  async findById(@Param('id') menuId: string) {
    const menu = await this._menuUC.findById(parseInt(menuId));
    return {
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

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
      message: 'Platillo removido del menú exitosamente',
      statusCode: HttpStatus.OK,
      data: menu,
    };
  }

  @Delete(':id')
  @DeleteMenuDocs()
  async delete(@Param('id') menuId: string) {
    await this._menuUC.delete(parseInt(menuId));
    return {
      message: 'Menú eliminado exitosamente',
      statusCode: HttpStatus.OK,
    };
  }
}
