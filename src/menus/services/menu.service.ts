import { In } from 'typeorm';
import { MenuRepository } from './../../shared/repositories/menu.repository';
import { RecipeRepository } from './../../shared/repositories/recipe.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { OrganizationalRepository } from './../../shared/repositories/organizational.repository';
import { Menu } from './../../shared/entities/menu.entity';
import { Recipe } from './../../shared/entities/recipe.entity';
import { Product } from './../../shared/entities/product.entity';
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
import { TranslationService } from '../../shared/services/translation.service';
import { MenuPublicListItem } from '../interface/menu.interface';

@Injectable()
export class MenuService {
  constructor(
    private readonly _menuRepository: MenuRepository,
    private readonly _recipeRepository: RecipeRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _translationService: TranslationService,
  ) {}

  /**
   * Reparte los `productIds` recibidos entre los dos caminos que puede tomar
   * un ítem de menú: si el producto tiene `Recipe` asociada entra por ahí
   * (así se muestran sus ingredientes); si no, es un producto normal —
   * de cualquier categoría— y entra por `MenuProduct` sin más requisitos.
   */
  private async _splitProductIds(
    productIds: number[],
  ): Promise<{ recipes: Recipe[]; products: Product[] }> {
    const recipes = await this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .where('product.productId IN (:...productIds)', { productIds })
      .getMany();

    const recipeProductIds = new Set(recipes.map((r) => r.product.productId));
    const plainProductIds = productIds.filter(
      (id) => !recipeProductIds.has(id),
    );

    let products: Product[] = [];
    if (plainProductIds.length > 0) {
      products = await this._productRepository.findBy({
        productId: In(plainProductIds),
      });

      const foundProductIds = new Set(products.map((p) => p.productId));
      const missingProducts = plainProductIds.filter(
        (id) => !foundProductIds.has(id),
      );
      if (missingProducts.length > 0) {
        throw new BadRequestException(
          `Los siguientes productos no existen: ${missingProducts.join(', ')}`,
        );
      }
    }

    return { recipes, products };
  }

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const { name: rawName, description: rawDesc, productIds, organizationalId } = createMenuDto;

    const [name, description] = await Promise.all([
      this._translationService.toTranslatedField(rawName),
      rawDesc ? this._translationService.toTranslatedField(rawDesc) : Promise.resolve(undefined),
    ]);

    const { recipes, products } = await this._splitProductIds(productIds);

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
      products,
      ...(organizational && { organizational, organizationalId }),
    });

    return await this._menuRepository.save(menu);
  }

  async update(menuId: number, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menu = await this._menuRepository.findOne({
      where: { menuId },
      relations: ['recipes', 'products'],
    });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    if (updateMenuDto.name !== undefined) {
      menu.name = await this._translationService.toTranslatedField(updateMenuDto.name);
    }

    if (updateMenuDto.description !== undefined) {
      menu.description = await this._translationService.toTranslatedField(updateMenuDto.description);
    }

    if (updateMenuDto.productIds !== undefined) {
      const { recipes, products } = await this._splitProductIds(
        updateMenuDto.productIds,
      );
      menu.recipes = recipes;
      menu.products = products;
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

  async findById(menuId: number): Promise<Menu> {
    const menu = await this._menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.recipes', 'recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .leftJoinAndSelect('menu.products', 'directProduct')
      .leftJoinAndSelect('directProduct.images', 'directProductImages')
      .leftJoinAndSelect('menu.organizational', 'organizational')
      .where('menu.menuId = :menuId', { menuId })
      .andWhere('menu.deletedAt IS NULL')
      .orderBy('productImages.position', 'ASC')
      .addOrderBy('directProductImages.position', 'ASC')
      .getOne();

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    return menu;
  }

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
      .leftJoinAndSelect('menu.products', 'directProduct')
      .leftJoinAndSelect('directProduct.images', 'directProductImages')
      .where('menu.deletedAt IS NULL');

    if (params.search) {
      qb.andWhere(`LOWER(menu.name->>'es') LIKE LOWER(:search)`, {
        search: `%${params.search.trim()}%`,
      });
    }

    if (params.organizationalId) {
      qb.andWhere('menu.organizationalId = :orgId', {
        orgId: params.organizationalId,
      });
    }

    const order = params.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy('menu.createdAt', order).addOrderBy('menu.menuId', order);

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
      .addSelect('menu.createdAt', 'createdAt')
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
        .leftJoinAndSelect('menu.products', 'directProduct')
        .leftJoinAndSelect('directProduct.images', 'directProductImages')
        .where('menu.menuId IN (:...menuIds)', { menuIds })
        .orderBy('menu.createdAt', order)
        .addOrderBy('menu.menuId', order)
        .addOrderBy('productImages.position', 'ASC')
        .addOrderBy('directProductImages.position', 'ASC')
        .getMany();
    }

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(data, pageMetaDto);
  }

  /**
   * Listado público (sin sesión) para la página de gastronomía. Solo une
   * `recipe.product.images` — a diferencia de `findAllPaginated`, no hace
   * falta el ingrediente ni la unidad de medida, que son costo interno.
   */
  async findAllPaginatedPublic(
    params: PaginatedMenuParamsDto,
  ): Promise<ResponsePaginationDto<MenuPublicListItem>> {
    const qb = this._menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.recipes', 'recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('menu.products', 'directProduct')
      .leftJoinAndSelect('directProduct.images', 'directProductImages')
      .where('menu.deletedAt IS NULL');

    if (params.search) {
      qb.andWhere(`LOWER(menu.name->>'es') LIKE LOWER(:search)`, {
        search: `%${params.search.trim()}%`,
      });
    }

    const order = params.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy('menu.createdAt', order).addOrderBy('menu.menuId', order);

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
      .addSelect('menu.createdAt', 'createdAt')
      .distinct(true)
      .offset(skip)
      .limit(params.perPage ?? 10)
      .getRawMany()
      .then((rows) => rows.map((r) => Number(r.menuId)));

    let menus: Menu[] = [];
    if (menuIds.length > 0) {
      menus = await this._menuRepository
        .createQueryBuilder('menu')
        .leftJoinAndSelect('menu.recipes', 'recipe')
        .leftJoinAndSelect('recipe.product', 'product')
        .leftJoinAndSelect('product.images', 'productImages')
        .leftJoinAndSelect('menu.products', 'directProduct')
        .leftJoinAndSelect('directProduct.images', 'directProductImages')
        .where('menu.menuId IN (:...menuIds)', { menuIds })
        .orderBy('menu.createdAt', order)
        .addOrderBy('menu.menuId', order)
        .addOrderBy('productImages.position', 'ASC')
        .addOrderBy('directProductImages.position', 'ASC')
        .getMany();
    }

    const data: MenuPublicListItem[] = menus.map((menu) => ({
      menuId: menu.menuId,
      name: menu.name,
      description: menu.description,
      dishes: this._groupRecipesByDish(menu.recipes, menu.products),
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(data, pageMetaDto);
  }

  /** Un solo menú para su página pública; mismo shape que el listado. */
  async findOnePublic(menuId: number): Promise<MenuPublicListItem> {
    const menu = await this._menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.recipes', 'recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('menu.products', 'directProduct')
      .leftJoinAndSelect('directProduct.images', 'directProductImages')
      .where('menu.menuId = :menuId', { menuId })
      .andWhere('menu.deletedAt IS NULL')
      .orderBy('productImages.position', 'ASC')
      .addOrderBy('directProductImages.position', 'ASC')
      .getOne();

    if (!menu) throw new NotFoundException('Menú no encontrado');

    return {
      menuId: menu.menuId,
      name: menu.name,
      description: menu.description,
      dishes: this._groupRecipesByDish(menu.recipes, menu.products),
    };
  }

  /**
   * `menu.recipes` trae UNA fila por ingrediente (un plato con 9 ingredientes
   * son 9 `Recipe` con el mismo `product`), igual que agrupa
   * `see-menus.component.ts` en el panel de staff. Sin este paso el listado
   * público repetiría cada platillo tantas veces como ingredientes tenga.
   * `products` son los productos normales (sin receta) del menú: se agregan
   * sin ingredientes, con el mismo shape.
   */
  private _groupRecipesByDish(
    recipes: Recipe[] | undefined,
    products: Product[] | undefined,
  ): MenuPublicListItem['dishes'] {
    const byProduct = new Map<number, MenuPublicListItem['dishes'][number]>();

    for (const recipe of recipes ?? []) {
      const productId = recipe.product.productId;
      if (byProduct.has(productId)) continue;

      byProduct.set(productId, {
        productId,
        name: recipe.product.name,
        description: recipe.product.description,
        priceSale: recipe.product.priceSale,
        images: (recipe.product.images ?? []).map((img) => ({
          productImageId: img.productImageId,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        })),
      });
    }

    for (const product of products ?? []) {
      if (byProduct.has(product.productId)) continue;

      byProduct.set(product.productId, {
        productId: product.productId,
        name: product.name,
        description: product.description,
        priceSale: product.priceSale,
        images: (product.images ?? []).map((img) => ({
          productImageId: img.productImageId,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        })),
      });
    }

    return Array.from(byProduct.values());
  }

  async removeProductFromMenu(menuId: number, productId: number): Promise<Menu> {
    const menu = await this._menuRepository.findOne({
      where: { menuId },
      relations: ['recipes', 'recipes.product', 'products'],
    });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    const beforeRecipeCount = menu.recipes.length;
    const beforeProductCount = menu.products.length;

    menu.recipes = menu.recipes.filter(
      (recipe) => recipe.product.productId !== productId,
    );
    menu.products = menu.products.filter(
      (product) => product.productId !== productId,
    );

    if (
      menu.recipes.length === beforeRecipeCount &&
      menu.products.length === beforeProductCount
    ) {
      throw new BadRequestException(
        `El producto con ID ${productId} no está asociado a este menú`,
      );
    }

    return await this._menuRepository.save(menu);
  }

  async delete(menuId: number): Promise<void> {
    const menu = await this._menuRepository.findOne({ where: { menuId } });

    if (!menu) {
      throw new NotFoundException(`Menú con ID ${menuId} no encontrado`);
    }

    await this._menuRepository.softDelete(menuId);
  }
}
