import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateRecipeDocs,
  UpdateRecipeDocs,
  UpdateRecipeIngredientDocs,
  FindByProductDocs,
  FindAllRecipesDocs,
  CheckAvailabilityDocs,
  DeleteByProductDocs,
  DeleteIngredientDocs,
} from '../decorators/recipe.decorators';
import { AuthGuard } from '@nestjs/passport';
import { RecipeService } from '../services/recipe.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
  CheckIngredientsAvailabilityDto,
} from '../dtos/recipe.dto';

@Controller('recipes')
@ApiTags('Recetas')
@UseGuards(AuthGuard())
export class RecipeController {
  constructor(private readonly _recipeService: RecipeService) {}

  @Post()
  @CreateRecipeDocs()
  async create(@Body() createDto: CreateRecipeDto) {
    const recipes = await this._recipeService.create(createDto);
    return {
      message: 'Receta creada exitosamente',
      statusCode: HttpStatus.CREATED,
      data: recipes,
    };
  }

  @Patch('product/:productId')
  @UpdateRecipeDocs()
  async updateByProduct(
    @Param('productId') productId: string,
    @Body() updateDto: UpdateRecipeDto,
  ) {
    const recipes = await this._recipeService.update(
      parseInt(productId),
      updateDto,
    );
    return {
      message: 'Receta actualizada exitosamente',
      statusCode: HttpStatus.OK,
      data: recipes,
    };
  }

  @Patch(':recipeId')
  @UpdateRecipeIngredientDocs()
  async updateIngredient(
    @Param('recipeId') recipeId: string,
    @Body() updateDto: UpdateRecipeIngredientDto,
  ) {
    const recipe = await this._recipeService.updateIngredient(
      parseInt(recipeId),
      updateDto,
    );
    return {
      message: 'Ingrediente actualizado exitosamente',
      statusCode: HttpStatus.OK,
      data: recipe,
    };
  }

  @Get('product/:productId')
  @FindByProductDocs()
  async findByProduct(@Param('productId') productId: string) {
    const recipe = await this._recipeService.findByProduct(parseInt(productId));
    return {
      statusCode: HttpStatus.OK,
      data: recipe,
    };
  }

  @Get()
  @FindAllRecipesDocs()
  async findAll() {
    const recipes = await this._recipeService.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: recipes,
    };
  }

  @Post('check-availability')
  @CheckAvailabilityDocs()
  async checkAvailability(@Body() checkDto: CheckIngredientsAvailabilityDto) {
    const availability = await this._recipeService.checkAvailability(checkDto);
    return {
      statusCode: HttpStatus.OK,
      data: availability,
    };
  }

  @Delete('product/:productId')
  @DeleteByProductDocs()
  async deleteByProduct(@Param('productId') productId: string) {
    await this._recipeService.deleteByProduct(parseInt(productId));
    return {
      message: 'Receta eliminada exitosamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':recipeId')
  @DeleteIngredientDocs()
  async deleteIngredient(@Param('recipeId') recipeId: string) {
    await this._recipeService.deleteIngredient(parseInt(recipeId));
    return {
      message: 'Ingrediente eliminado de la receta',
      statusCode: HttpStatus.OK,
    };
  }
}
