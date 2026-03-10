import { Injectable } from '@nestjs/common';
import { RecipeService } from '../services/recipe.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
  CheckIngredientsAvailabilityDto,
  CheckAvailabilityResponse,
  RecipeWithDetailsResponse,
  PaginatedRecipesParamsDto,
} from '../dtos/recipe.dto';
import { Recipe } from './../../shared/entities/recipe.entity';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';

@Injectable()
export class RecipeUC {
  constructor(private readonly _recipeService: RecipeService) {}

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe[]> {
    return await this._recipeService.create(createRecipeDto);
  }

  async updateByProduct(
    productId: number,
    updateRecipeDto: UpdateRecipeDto,
  ): Promise<Recipe[]> {
    return await this._recipeService.update(productId, updateRecipeDto);
  }

  async updateIngredient(
    recipeId: number,
    updateDto: UpdateRecipeIngredientDto,
  ): Promise<Recipe> {
    return await this._recipeService.updateIngredient(recipeId, updateDto);
  }

  async findAllPaginated(
    params: PaginatedRecipesParamsDto,
  ): Promise<ResponsePaginationDto<RecipeWithDetailsResponse>> {
    return await this._recipeService.findAllPaginated(params);
  }

  async findByProduct(productId: number): Promise<RecipeWithDetailsResponse> {
    return await this._recipeService.findByProduct(productId);
  }

  async checkAvailability(
    dto: CheckIngredientsAvailabilityDto,
  ): Promise<CheckAvailabilityResponse> {
    return await this._recipeService.checkAvailability(dto);
  }

  async deleteByProduct(productId: number): Promise<void> {
    return await this._recipeService.deleteByProduct(productId);
  }

  async deleteIngredient(recipeId: number): Promise<void> {
    return await this._recipeService.deleteIngredient(recipeId);
  }
}
