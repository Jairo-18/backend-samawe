import { Injectable } from '@nestjs/common';
import { MenuService } from '../services/menu.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  PaginatedMenuParamsDto,
} from '../dtos/menu.dto';
import { Menu } from './../../shared/entities/menu.entity';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';

@Injectable()
export class MenuUC {
  constructor(private readonly _menuService: MenuService) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    return await this._menuService.create(createMenuDto);
  }

  async update(menuId: number, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    return await this._menuService.update(menuId, updateMenuDto);
  }

  async findById(menuId: number): Promise<Menu> {
    return await this._menuService.findById(menuId);
  }

  async findAllPaginated(
    params: PaginatedMenuParamsDto,
  ): Promise<ResponsePaginationDto<Menu>> {
    return await this._menuService.findAllPaginated(params);
  }

  async delete(menuId: number): Promise<void> {
    return await this._menuService.delete(menuId);
  }

  async removeProductFromMenu(
    menuId: number,
    productId: number,
  ): Promise<Menu> {
    return await this._menuService.removeProductFromMenu(menuId, productId);
  }
}
