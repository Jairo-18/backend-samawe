import { MenuRepository } from './../../shared/repositories/menu.repository';
import { RecipeRepository } from './../../shared/repositories/recipe.repository';
import { OrganizationalRepository } from './../../shared/repositories/organizational.repository';
import { Menu } from './../../shared/entities/menu.entity';
import {
  CreateMenuDto,
  UpdateMenuDto,
  PaginatedMenuParamsDto,
} from './../dtos/menu.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly _menuRepository: MenuRepository,
    private readonly _recipeRepository: RecipeRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  /**
   * Finds all Recipe rows that belong to the given product IDs.
   * A "recipe" in this system is one ingredient row per product,
   * so a single product may have multiple Recipe rows.
   */
  private async _findRecipesByProductIds(productIds: number[]) {
    const recipes = await this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .where('product.productId IN (:...productIds)', { productIds })
      .getMany();

    if (recipes.length === 0) {
      throw new BadRequestException(
        'No se encontraron recetas para los productos proporcionados',
      );
    }

    const foundProductIds = new Set(recipes.map((r) => r.product.productId));
    const missingProducts = productIds.filter((id) => !foundProductIds.has(id));
    if (missingProducts.length > 0) {
      throw new BadRequestException(
        `Los siguientes productos no tienen receta: ${missingProducts.join(', ')}`,
      );
    }

    return recipes;
  }

  /**
   * Crear un menú con recetas asociadas a los productos indicados
   */
  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const { name, description, productIds, organizationalId } = createMenuDto;

    const recipes = await this._findRecipesByProductIds(productIds);

    let organizational = null;
    if (organizationalId) {
      organizational = await this._organizationalRepository.findOne({
        where: { organizationalId },
      });
      if (!organizational) {
        throw new BadRequestException('Organización no encontrada');
      }
    }

    const menu = this._menuRepository.create({
      name,
      description,
      recipes,
      ...(organizational && { organizational, organizationalId }),
    });

    return await this._menuRepository.save(menu);
  }

  /**
   * Actualizar un menú existente
   */
  async update(menuId: number, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menu = await this._menuRepository.findOne({
      where: { menuId },
      relations: ['recipes'],
    });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    if (updateMenuDto.name !== undefined) {
      menu.name = updateMenuDto.name;
    }

    if (updateMenuDto.description !== undefined) {
      menu.description = updateMenuDto.description;
    }

    if (updateMenuDto.productIds !== undefined) {
      menu.recipes = await this._findRecipesByProductIds(
        updateMenuDto.productIds,
      );
    }

    if (updateMenuDto.organizationalId !== undefined) {
      const organizational = await this._organizationalRepository.findOne({
        where: { organizationalId: updateMenuDto.organizationalId },
      });
      if (!organizational) {
        throw new BadRequestException('Organización no encontrada');
      }
      menu.organizational = organizational;
      menu.organizationalId = updateMenuDto.organizationalId;
    }

    return await this._menuRepository.save(menu);
  }

  /**
   * Obtener un menú por ID con sus recetas e ingredientes
   */
  async findById(menuId: number): Promise<Menu> {
    const menu = await this._menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.recipes', 'recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .leftJoinAndSelect('menu.organizational', 'organizational')
      .where('menu.menuId = :menuId', { menuId })
      .andWhere('menu.deletedAt IS NULL')
      .getOne();

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    return menu;
  }

  /**
   * Listar menús paginados con búsqueda por nombre
   */
  async findAllPaginated(
    params: PaginatedMenuParamsDto,
  ): Promise<ResponsePaginationDto<Menu>> {
    const qb = this._menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.recipes', 'recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .where('menu.deletedAt IS NULL');

    if (params.search) {
      qb.andWhere('LOWER(menu.name) LIKE LOWER(:search)', {
        search: `%${params.search.trim()}%`,
      });
    }

    if (params.organizationalId) {
      qb.andWhere('menu.organizationalId = :orgId', {
        orgId: params.organizationalId,
      });
    }

    const order = params.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy('menu.name', order);

    const itemCount = await qb
      .clone()
      .orderBy()
      .select('COUNT(DISTINCT menu.menuId)', 'count')
      .getRawOne()
      .then((r) => Number(r?.count ?? 0));

    const skip = ((params.page ?? 1) - 1) * (params.perPage ?? 10);

    const menuIds = await qb
      .clone()
      .select('menu.menuId', 'menuId')
      .addSelect('menu.name', 'name')
      .distinct(true)
      .offset(skip)
      .limit(params.perPage ?? 10)
      .getRawMany()
      .then((rows) => rows.map((r) => Number(r.menuId)));

    let data: Menu[] = [];
    if (menuIds.length > 0) {
      data = await this._menuRepository
        .createQueryBuilder('menu')
        .leftJoinAndSelect('menu.recipes', 'recipe')
        .leftJoinAndSelect('recipe.product', 'product')
        .leftJoinAndSelect('product.images', 'productImages')
        .leftJoinAndSelect('recipe.ingredient', 'ingredient')
        .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
        .where('menu.menuId IN (:...menuIds)', { menuIds })
        .orderBy('menu.name', order)
        .getMany();
    }

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(data, pageMetaDto);
  }

  /**
   * Quitar un platillo (producto) específico del menú sin eliminar el menú.
   * Remueve todas las filas de Recipe asociadas a ese productId.
   */
  async removeProductFromMenu(
    menuId: number,
    productId: number,
  ): Promise<Menu> {
    const menu = await this._menuRepository.findOne({
      where: { menuId },
      relations: ['recipes', 'recipes.product'],
    });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    const beforeCount = menu.recipes.length;
    menu.recipes = menu.recipes.filter(
      (recipe) => recipe.product.productId !== productId,
    );

    if (menu.recipes.length === beforeCount) {
      throw new BadRequestException(
        `El producto con ID ${productId} no está asociado a este menú`,
      );
    }

    return await this._menuRepository.save(menu);
  }

  /**
   * Eliminar un menú (soft delete)
   */
  async delete(menuId: number): Promise<void> {
    const menu = await this._menuRepository.findOne({
      where: { menuId },
    });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    await this._menuRepository.softDelete(menuId);
  }
}
