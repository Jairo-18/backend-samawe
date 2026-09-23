import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuUC } from '../useCases/menuUC.uc';
import { PaginatedMenuParamsDto } from '../dtos/menu.dto';
import { ResponsePaginationDto } from '../../shared/dtos/pagination.dto';
import { MenuPublicListItem } from '../interface/menu.interface';

@Controller('menus/public')
@ApiTags('Menús Público')
export class MenuPublicController {
  constructor(private readonly _menuUC: MenuUC) {}

  @Get('list')
  @ApiOperation({
    summary: 'Listado paginado de menús para la página de gastronomía (acceso público)',
  })
  @ApiOkResponse({ description: 'Listado paginado de menús' })
  async getPublicList(
    @Query() params: PaginatedMenuParamsDto,
  ): Promise<ResponsePaginationDto<MenuPublicListItem>> {
    return this._menuUC.findAllPaginatedPublic(params);
  }
}
