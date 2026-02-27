import { RecipeRepository } from './../../shared/repositories/recipe.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Recipe } from './../../shared/entities/recipe.entity';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
  RecipeWithDetailsResponse,
  CheckIngredientsAvailabilityDto,
  CheckAvailabilityResponse,
  IngredientAvailability,
  PaginatedRecipesParamsDto,
} from './../dtos/recipe.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';

@Injectable()
export class RecipeService {
  constructor(
    private readonly _recipeRepository: RecipeRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

  /**
   * Listar todas las recetas paginadas, agrupadas por producto.
   * Sigue el mismo patrón que CrudProductService: PageMetaDto + ResponsePaginationDto.
   */
  async findAllPaginated(
    params: PaginatedRecipesParamsDto,
  ): Promise<ResponsePaginationDto<RecipeWithDetailsResponse>> {
    const qb = this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .where('product.deletedAt IS NULL');

    if (params.search) {
      qb.andWhere('LOWER(product.name) LIKE LOWER(:search)', {
        search: `%${params.search.trim()}%`,
      });
    }

    const allRows = await qb.orderBy('product.name', 'ASC').getMany();

    const grouped = new Map<number, RecipeWithDetailsResponse>();

    const ingredientSubRecipeMap = new Map<number, Recipe[]>();
    const ingredientProductIds = new Set<number>();
    for (const row of allRows) {
      ingredientProductIds.add(row.ingredient.productId);
    }

    if (ingredientProductIds.size > 0) {
      const subRecipeRows = await this._recipeRepository
        .createQueryBuilder('recipe')
        .leftJoinAndSelect('recipe.product', 'product')
        .leftJoinAndSelect('recipe.ingredient', 'ingredient')
        .where('product.productId IN (:...ids)', {
          ids: Array.from(ingredientProductIds),
        })
        .getMany();

      for (const sr of subRecipeRows) {
        const pid = sr.product.productId;
        if (!ingredientSubRecipeMap.has(pid)) {
          ingredientSubRecipeMap.set(pid, []);
        }
        ingredientSubRecipeMap.get(pid)!.push(sr);
      }
    }

    for (const row of allRows) {
      const pid = row.product.productId;
      if (!grouped.has(pid)) {
        grouped.set(pid, {
          productId: pid,
          productName: row.product.name,
          images:
            row.product.images?.map((img) => ({
              productImageId: img.productImageId,
              imageUrl: img.imageUrl,
              publicId: img.publicId,
            })) || [],
          ingredients: [],
          totalRecipeCost: 0,
          availablePortions: Infinity,
          minIngredientAmount: Infinity,
        });
      }
      const entry = grouped.get(pid)!;

      const reqQty = Number(row.quantity);
      let availableQty = Number(row.ingredient?.amount || 0);

      const subRecipes = ingredientSubRecipeMap.get(row.ingredient.productId);
      if (subRecipes && subRecipes.length > 0) {
        let subMinPortions = Infinity;
        for (const sr of subRecipes) {
          const srReqQty = Number(sr.quantity);
          const srAvailQty = Number(sr.ingredient?.amount || 0);
          if (srReqQty > 0) {
            const srPortions = Math.floor(srAvailQty / srReqQty);
            if (srPortions < subMinPortions) {
              subMinPortions = srPortions;
            }
          } else {
            subMinPortions = 0;
          }
        }
        availableQty = subMinPortions === Infinity ? 0 : subMinPortions;
      }

      if (reqQty > 0) {
        const portions = Math.floor(availableQty / reqQty);
        if (portions < entry.availablePortions!) {
          entry.availablePortions = portions;
        }
      } else {
        entry.availablePortions = 0;
      }

      if (availableQty < entry.minIngredientAmount!) {
        entry.minIngredientAmount = availableQty;
      }

      const ingredientPriceBuy = Number(row.ingredient?.priceBuy || 0);
      let effectivePriceBuy = ingredientPriceBuy;
      if (subRecipes && subRecipes.length > 0) {
        effectivePriceBuy = 0;
        for (const sr of subRecipes) {
          effectivePriceBuy +=
            Number(sr.quantity) * Number(sr.ingredient?.priceBuy || 0);
        }
      }

      const totalCost = reqQty * effectivePriceBuy;
      entry.totalRecipeCost = Number(
        (Number(entry.totalRecipeCost) + totalCost).toFixed(2),
      );
      entry.ingredients.push({
        ingredientProductId: row.ingredient.productId,
        ingredientProductName: row.ingredient.name,
        unit: row.ingredient.unitOfMeasure?.code ?? 'N/A',
        quantity: reqQty,
        cost: Number(effectivePriceBuy.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        ingredientAmount: availableQty,
        notes: row.notes,
      });
    }

    const allRecipes = Array.from(grouped.values()).map((recipe) => {
      if (recipe.availablePortions === Infinity) {
        recipe.availablePortions = 0;
      }
      if (recipe.minIngredientAmount === Infinity) {
        recipe.minIngredientAmount = 0;
      }
      return recipe;
    });

    const itemCount = allRecipes.length;
    const skip = ((params.page ?? 1) - 1) * (params.perPage ?? 10);
    const data = allRecipes.slice(skip, skip + (params.perPage ?? 10));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(data, pageMetaDto);
  }

  /**
   * Crear una receta completa para un plato
   */
  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe[]> {
    const { productId, ingredients } = createRecipeDto;

    const product = await this._productRepository.findOne({
      where: { productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    const ingredientIds = ingredients.map((i) => i.ingredientProductId);
    const foundIngredients = await this._productRepository.find({
      where: { productId: In(ingredientIds) },
    });

    if (foundIngredients.length !== ingredientIds.length) {
      throw new BadRequestException(
        'Uno o más ingredientes no fueron encontrados',
      );
    }

    await this._recipeRepository.delete({ product: { productId } });

    const recipes: Recipe[] = [];
    for (const ingredientDto of ingredients) {
      const ingredient = foundIngredients.find(
        (i) => i.productId === ingredientDto.ingredientProductId,
      );

      const recipe = this._recipeRepository.create({
        product,
        ingredient,
        quantity: ingredientDto.quantity,
        notes: ingredientDto.notes,
      });

      const savedRecipe = await this._recipeRepository.save(recipe);
      recipes.push(savedRecipe);
    }

    return recipes;
  }

  /**
   * Actualizar la receta completa de un plato (reemplaza ingredientes)
   */
  async update(
    productId: number,
    updateRecipeDto: UpdateRecipeDto,
  ): Promise<Recipe[]> {
    return await this.create({
      productId,
      ingredients: updateRecipeDto.ingredients,
    });
  }

  /**
   * Actualizar un ingrediente específico de una receta
   */
  async updateIngredient(
    recipeId: number,
    updateDto: UpdateRecipeIngredientDto,
  ): Promise<Recipe> {
    const recipe = await this._recipeRepository.findOne({
      where: { recipeId },
      relations: ['product', 'ingredient'],
    });

    if (!recipe) {
      throw new NotFoundException(`Receta con ID ${recipeId} no encontrada`);
    }

    if (updateDto.quantity !== undefined) {
      recipe.quantity = updateDto.quantity;
    }

    if (updateDto.notes !== undefined) {
      recipe.notes = updateDto.notes;
    }

    return await this._recipeRepository.save(recipe);
  }

  /**
   * Obtener la receta completa de un plato con detalles de ingredientes
   */
  async findByProduct(productId: number): Promise<RecipeWithDetailsResponse> {
    const product = await this._productRepository.findOne({
      where: { productId },
      relations: ['images'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    const recipes = await this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('product.images', 'product_images')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .where('product.productId = :productId', { productId })
      .getMany();

    if (!recipes || recipes.length === 0) {
      return {
        productId: product.productId,
        productName: product.name,
        images:
          product.images?.map((img) => ({
            productImageId: img.productImageId,
            imageUrl: img.imageUrl,
            publicId: img.publicId,
          })) || [],
        ingredients: [],
        totalRecipeCost: 0,
      };
    }

    let totalRecipeCost = 0;

    const ingredients = recipes.map((recipe) => {
      const totalCost =
        Number(recipe.quantity) * Number(recipe.ingredient.priceBuy);
      totalRecipeCost += totalCost;

      return {
        ingredientProductId: recipe.ingredient.productId,
        ingredientProductName: recipe.ingredient.name,
        unit: recipe.ingredient.unitOfMeasure
          ? recipe.ingredient.unitOfMeasure.code
          : 'N/A',
        quantity: Number(recipe.quantity),
        cost: Number(recipe.ingredient.priceBuy),
        totalCost: Number(totalCost.toFixed(2)),
        ingredientAmount: Number(recipe.ingredient.amount),
        notes: recipe.notes,
      };
    });

    return {
      productId: product.productId,
      productName: product.name,
      images:
        product.images?.map((img) => ({
          productImageId: img.productImageId,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        })) || [],
      ingredients,
      totalRecipeCost: Number(totalRecipeCost.toFixed(2)),
    };
  }

  /**
   * Verificar disponibilidad de ingredientes para preparar un plato.
   * Soporta recetas anidadas: si un ingrediente es a su vez un sub-preparado,
   * verifica recursivamente los ingredientes base de ese sub-preparado.
   */
  async checkAvailability(
    dto: CheckIngredientsAvailabilityDto,
    visited: Set<number> = new Set(),
  ): Promise<CheckAvailabilityResponse> {
    const { productId, portions = 1 } = dto;

    const recipeDetails = await this.findByProduct(productId);

    const ingredientsAvailability: IngredientAvailability[] = [];
    let canPrepare = true;

    for (const recipeIngredient of recipeDetails.ingredients) {
      const required = Number(recipeIngredient.quantity) * portions;

      const subRecipeCount = await this._recipeRepository.count({
        where: { product: { productId: recipeIngredient.ingredientProductId } },
      });

      if (
        subRecipeCount > 0 &&
        !visited.has(recipeIngredient.ingredientProductId)
      ) {
        visited.add(recipeIngredient.ingredientProductId);
        const subAvailability = await this.checkAvailability(
          {
            productId: recipeIngredient.ingredientProductId,
            portions: required,
          },
          visited,
        );

        for (const subIng of subAvailability.ingredients) {
          const existing = ingredientsAvailability.find(
            (i) => i.ingredientProductId === subIng.ingredientProductId,
          );
          if (existing) {
            existing.required += subIng.required;
            existing.isAvailable = existing.available >= existing.required;
          } else {
            ingredientsAvailability.push({ ...subIng });
          }
          if (!subIng.isAvailable) canPrepare = false;
        }
      } else {
        const ingredient = await this._productRepository.findOne({
          where: { productId: recipeIngredient.ingredientProductId },
          relations: ['unitOfMeasure'],
        });

        if (!ingredient) continue;

        const available = Number(ingredient.amount);
        const isAvailable = available >= required;

        if (!isAvailable) canPrepare = false;

        const existing = ingredientsAvailability.find(
          (i) => i.ingredientProductId === ingredient.productId,
        );
        if (existing) {
          existing.required += required;
          existing.isAvailable = existing.available >= existing.required;
          if (!existing.isAvailable) canPrepare = false;
        } else {
          ingredientsAvailability.push({
            ingredientProductId: ingredient.productId,
            ingredientProductName: ingredient.name,
            required: Number(required.toFixed(3)),
            available: Number(available.toFixed(3)),
            unit: ingredient.unitOfMeasure
              ? ingredient.unitOfMeasure.code
              : 'N/A',
            isAvailable,
          });
        }
      }
    }

    const missingIngredients = ingredientsAvailability.filter(
      (i) => !i.isAvailable,
    );

    return {
      productId: recipeDetails.productId,
      productName: recipeDetails.productName,
      portions,
      canPrepare,
      ingredients: ingredientsAvailability,
      missingIngredients,
    };
  }

  /**
   * Reducir stock de ingredientes al preparar un plato.
   * Soporta recetas ANIDADAS: si un ingrediente del plato a su vez tiene
   * su propia receta (ej: "Cebolla caramelizada" tiene receta con miel,
   * vinagre, cebolla y sal), se consumen recursivamente los ingredientes
   * de esa sub-receta en lugar de descontar el stock del preparado intermedio.
   */
  async consumeIngredients(
    productId: number,
    portions: number = 1,
    visited: Set<number> = new Set(),
  ): Promise<void> {
    if (visited.has(productId)) {
      return;
    }
    visited.add(productId);

    if (visited.size === 1) {
      const availability = await this.checkAvailability({
        productId,
        portions,
      });
      if (!availability.canPrepare) {
        const missing = availability.missingIngredients
          .map(
            (i) =>
              `${i.ingredientProductName}: falta ${(i.required - i.available).toFixed(3)} ${i.unit}`,
          )
          .join(', ');
        throw new BadRequestException(
          `No hay suficientes ingredientes para preparar ${portions} porción(es). Faltantes: ${missing}`,
        );
      }
    }

    const recipes = await this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .where('product.productId = :productId', { productId })
      .getMany();

    for (const recipe of recipes) {
      const quantityToReduce = Number(recipe.quantity) * portions;
      const ingredient = recipe.ingredient;

      const subRecipeCount = await this._recipeRepository.count({
        where: { product: { productId: ingredient.productId } },
      });

      if (subRecipeCount > 0) {
        await this.consumeIngredients(
          ingredient.productId,
          quantityToReduce,
          visited,
        );
      } else {
        const ingredientFresh = await this._productRepository.findOne({
          where: { productId: ingredient.productId },
          relations: ['unitOfMeasure'],
        });

        if (!ingredientFresh) continue;

        ingredientFresh.amount =
          Number(ingredientFresh.amount) - quantityToReduce;

        await this._productRepository.save(ingredientFresh);
      }
    }
  }

  /**
   * Devolver al stock los ingredientes de una receta (operación inversa a consumeIngredients).
   * Soporta recetas anidadas: si un ingrediente es un sub-preparado, restaura
   * recursivamente sus ingredientes base.
   *
   * Se usa cuando se elimina/cancela un detalle de factura de tipo restaurante.
   */
  async restoreIngredients(
    productId: number,
    portions: number = 1,
    visited: Set<number> = new Set(),
  ): Promise<void> {
    if (visited.has(productId)) {
      return;
    }
    visited.add(productId);

    const recipes = await this._recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.product', 'product')
      .leftJoinAndSelect('recipe.ingredient', 'ingredient')
      .leftJoinAndSelect('ingredient.unitOfMeasure', 'unitOfMeasure')
      .where('product.productId = :productId', { productId })
      .getMany();

    if (!recipes || recipes.length === 0) {
      return;
    }

    for (const recipe of recipes) {
      const quantityToRestore = Number(recipe.quantity) * portions;
      const ingredient = recipe.ingredient;

      const subRecipeCount = await this._recipeRepository.count({
        where: { product: { productId: ingredient.productId } },
      });

      if (subRecipeCount > 0) {
        await this.restoreIngredients(
          ingredient.productId,
          quantityToRestore,
          visited,
        );
      } else {
        const ingredientFresh = await this._productRepository.findOne({
          where: { productId: ingredient.productId },
          relations: ['unitOfMeasure'],
        });

        if (!ingredientFresh) continue;

        ingredientFresh.amount =
          Number(ingredientFresh.amount) + quantityToRestore;

        await this._productRepository.save(ingredientFresh);
      }
    }
  }

  /**
   * Eliminar receta de un producto
   */
  async deleteByProduct(productId: number): Promise<void> {
    await this._recipeRepository.delete({ product: { productId } });
  }

  /**
   * Eliminar un ingrediente específico de una receta
   */
  async deleteIngredient(recipeId: number): Promise<void> {
    const recipe = await this._recipeRepository.findOne({
      where: { recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Receta con ID ${recipeId} no encontrada`);
    }

    await this._recipeRepository.delete(recipeId);
  }
}
