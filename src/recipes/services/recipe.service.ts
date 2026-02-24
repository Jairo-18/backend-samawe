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
} from './../dtos/recipe.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';

@Injectable()
export class RecipeService {
  constructor(
    private readonly _recipeRepository: RecipeRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

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

    console.log(
      `📝 Receta creada para ${product.name} con ${recipes.length} ingredientes`,
    );

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
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    const recipes = await this._recipeRepository.find({
      where: { product: { productId } },
      relations: ['ingredient', 'ingredient.unitOfMeasure'],
    });

    if (!recipes || recipes.length === 0) {
      throw new NotFoundException(
        `No se encontró receta para el producto ${product.name}`,
      );
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
        notes: recipe.notes,
      };
    });

    return {
      productId: product.productId,
      productName: product.name,
      ingredients,
      totalRecipeCost: Number(totalRecipeCost.toFixed(2)),
    };
  }

  /**
   * Obtener todas las recetas
   */
  async findAll(): Promise<Recipe[]> {
    return await this._recipeRepository.find({
      relations: ['product', 'ingredient'],
      order: { product: { name: 'ASC' } },
    });
  }

  /**
   * Verificar disponibilidad de ingredientes para preparar un plato
   */
  async checkAvailability(
    dto: CheckIngredientsAvailabilityDto,
  ): Promise<CheckAvailabilityResponse> {
    const { productId, portions = 1 } = dto;

    const recipeDetails = await this.findByProduct(productId);

    const ingredientsAvailability: IngredientAvailability[] = [];
    let canPrepare = true;

    for (const recipeIngredient of recipeDetails.ingredients) {
      const ingredient = await this._productRepository.findOne({
        where: { productId: recipeIngredient.ingredientProductId },
        relations: ['unitOfMeasure'],
      });

      const required = Number(recipeIngredient.quantity) * portions;
      const available = Number(ingredient.amount);
      const isAvailable = available >= required;

      if (!isAvailable) {
        canPrepare = false;
      }

      ingredientsAvailability.push({
        ingredientProductId: ingredient.productId,
        ingredientProductName: ingredient.name,
        required: Number(required.toFixed(3)),
        available: Number(available.toFixed(3)),
        unit: ingredient.unitOfMeasure ? ingredient.unitOfMeasure.code : 'N/A',
        isAvailable,
      });
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
   * Reducir stock de ingredientes al preparar un plato
   * Esta es la función CLAVE que se llama cuando se cocina un plato
   */
  async consumeIngredients(
    productId: number,
    portions: number = 1,
  ): Promise<void> {
    const availability = await this.checkAvailability({ productId, portions });

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

    const recipes = await this._recipeRepository.find({
      where: { product: { productId } },
      relations: ['ingredient', 'ingredient.unitOfMeasure'],
    });

    for (const recipe of recipes) {
      const quantityToReduce = Number(recipe.quantity) * portions;
      const ingredient = recipe.ingredient;

      ingredient.amount = Number(ingredient.amount) - quantityToReduce;

      await this._productRepository.save(ingredient);

      const unitCode = ingredient.unitOfMeasure
        ? ingredient.unitOfMeasure.code
        : 'N/A';
      console.log(
        `🍳 Ingrediente consumido - ${ingredient.name}: -${quantityToReduce.toFixed(3)} ${unitCode} (Restante: ${ingredient.amount.toFixed(3)} ${unitCode})`,
      );
    }

    console.log(
      `✅ Stock reducido para ${availability.productName} - ${portions} porción(es)`,
    );
  }

  /**
   * Eliminar receta de un producto
   */
  async deleteByProduct(productId: number): Promise<void> {
    await this._recipeRepository.delete({ product: { productId } });
    console.log(`🗑️ Receta eliminada para producto ID ${productId}`);
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
