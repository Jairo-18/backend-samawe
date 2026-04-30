import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateRecipeDocs,
  UpdateRecipeDocs,
  UpdateRecipeIngredientDocs,
  FindByProductDocs,
  CheckAvailabilityDocs,
  DeleteByProductDocs,
  DeleteIngredientDocs,
} from '../decorators/recipe.decorators';
import { AuthGuard } from '@nestjs/passport';
import { RecipeUC } from '../useCases/recipeUC.uc';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
  CheckIngredientsAvailabilityDto,
  PaginatedRecipesParamsDto,
} from '../dtos/recipe.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@Controller('recipes')
@ApiTags('Recetas')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
)
export class RecipeController {
  constructor(private readonly _recipeUC: RecipeUC) {}

  @Post()
  @CreateRecipeDocs()
  async create(@Body() createDto: CreateRecipeDto, @Req() req: any) {
    createDto.organizationalId =
      req.user?.organizationalId ?? createDto.organizationalId;
    const recipes = await this._recipeUC.create(createDto);
    return {
      message: 'api.recipe.created',
      statusCode: HttpStatus.CREATED,
      data: recipes,
    };
  }

  @Patch('product/:productId')
  @UpdateRecipeDocs()
  async updateByProduct(
    @Param('productId') productId: string,
    @Body() updateDto: UpdateRecipeDto,
    @Req() req: any,
  ) {
    updateDto.organizationalId =
      req.user?.organizationalId ?? updateDto.organizationalId;
    const recipes = await this._recipeUC.updateByProduct(
      parseInt(productId),
      updateDto,
    );
    return {
      message: 'api.recipe.updated',
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
    const recipe = await this._recipeUC.updateIngredient(
      parseInt(recipeId),
      updateDto,
    );
    return {
      message: 'api.recipe.ingredient_updated',
      statusCode: HttpStatus.OK,
      data: recipe,
    };
  }

  @Get('paginated')
  async findAllPaginated(@Query() params: PaginatedRecipesParamsDto) {
    return await this._recipeUC.findAllPaginated(params);
  }

  @Get('product/:productId')
  @FindByProductDocs()
  async findByProduct(@Param('productId') productId: string) {
    const recipe = await this._recipeUC.findByProduct(parseInt(productId));
    return {
      statusCode: HttpStatus.OK,
      data: recipe,
    };
  }

  @Post('check-availability')
  @CheckAvailabilityDocs()
  async checkAvailability(@Body() checkDto: CheckIngredientsAvailabilityDto) {
    const availability = await this._recipeUC.checkAvailability(checkDto);
    return {
      statusCode: HttpStatus.OK,
      data: availability,
    };
  }

  @Delete('product/:productId')
  @DeleteByProductDocs()
  async deleteByProduct(@Param('productId') productId: string) {
    await this._recipeUC.deleteByProduct(parseInt(productId));
    return {
      message: 'api.recipe.deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':recipeId')
  @DeleteIngredientDocs()
  async deleteIngredient(@Param('recipeId') recipeId: string) {
    await this._recipeUC.deleteIngredient(parseInt(recipeId));
    return {
      message: 'api.recipe.ingredient_deleted',
      statusCode: HttpStatus.OK,
    };
  }
}
