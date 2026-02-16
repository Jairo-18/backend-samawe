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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
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
export class RecipeController {
  constructor(private readonly _recipeService: RecipeService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Crear receta para un plato',
    description: 'Define qué ingredientes y en qué cantidad lleva un plato',
  })
  @ApiOkResponse({ description: 'Receta creada exitosamente' })
  async create(@Body() createDto: CreateRecipeDto) {
    const recipes = await this._recipeService.create(createDto);
    return {
      message: 'Receta creada exitosamente',
      statusCode: HttpStatus.CREATED,
      data: recipes,
    };
  }

  @Patch('product/:productId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Actualizar receta completa de un plato',
    description: 'Reemplaza todos los ingredientes de la receta',
  })
  @ApiOkResponse({ description: 'Receta actualizada' })
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
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Actualizar un ingrediente específico de una receta',
  })
  @ApiOkResponse({ description: 'Ingrediente de receta actualizado' })
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
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Obtener receta completa de un plato',
    description:
      'Devuelve todos los ingredientes con cantidades y costo total',
  })
  @ApiOkResponse({ description: 'Receta del plato' })
  async findByProduct(@Param('productId') productId: string) {
    const recipe = await this._recipeService.findByProduct(parseInt(productId));
    return {
      statusCode: HttpStatus.OK,
      data: recipe,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Obtener todas las recetas' })
  @ApiOkResponse({ description: 'Lista de recetas' })
  async findAll() {
    const recipes = await this._recipeService.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: recipes,
    };
  }

  @Post('check-availability')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Verificar disponibilidad de ingredientes para un plato',
    description:
      'Verifica si hay stock suficiente para preparar N porciones de un plato',
  })
  @ApiOkResponse({
    description: 'Disponibilidad de ingredientes con detalles',
  })
  async checkAvailability(@Body() checkDto: CheckIngredientsAvailabilityDto) {
    const availability = await this._recipeService.checkAvailability(checkDto);
    return {
      statusCode: HttpStatus.OK,
      data: availability,
    };
  }

  @Delete('product/:productId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Eliminar receta completa de un plato',
  })
  @ApiOkResponse({ description: 'Receta eliminada' })
  async deleteByProduct(@Param('productId') productId: string) {
    await this._recipeService.deleteByProduct(parseInt(productId));
    return {
      message: 'Receta eliminada exitosamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':recipeId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Eliminar un ingrediente específico de una receta',
  })
  @ApiOkResponse({ description: 'Ingrediente eliminado de la receta' })
  async deleteIngredient(@Param('recipeId') recipeId: string) {
    await this._recipeService.deleteIngredient(parseInt(recipeId));
    return {
      message: 'Ingrediente eliminado de la receta',
      statusCode: HttpStatus.OK,
    };
  }
}
