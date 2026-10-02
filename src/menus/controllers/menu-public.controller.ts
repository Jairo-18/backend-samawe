import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuUC } from '../useCases/menuUC.uc';
import { PaginatedMenuParamsDto } from '../dtos/menu.dto';
import { ResponsePaginationDto } from '../../shared/dtos/pagination.dto';
import { MenuPublicListItem } from '../interface/menu.interface';

@Controller('menus/public')
@ApiTags('Menús Público')
export class MenuPublicController {
  constructor(private readonly _menuUC: MenuUC) {}

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
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

  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Get(':id')
  @ApiOperation({
    summary: 'Un menú con sus platillos para su página pública (acceso público)',
  })
  @ApiOkResponse({ description: 'Menú con platillos' })
  async getPublicOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ statusCode: number; data: MenuPublicListItem }> {
    const data = await this._menuUC.findOnePublic(id);
    return { statusCode: HttpStatus.OK, data };
  }
}
