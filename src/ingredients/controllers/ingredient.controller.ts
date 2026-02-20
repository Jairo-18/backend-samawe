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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IngredientService } from '../services/ingredient.service';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  AdjustStockDto,
} from '../dtos/ingredient.dto';
import { PaginatedListIngredientsParamsDto } from '../dtos/crudIngredient.dto';

@Controller('ingredients')
@ApiTags('Ingredientes')
export class IngredientController {
  constructor(private readonly _ingredientService: IngredientService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Crear un nuevo ingrediente' })
  @ApiOkResponse({ description: 'Ingrediente creado exitosamente' })
  async create(@Body() createDto: CreateIngredientDto) {
    const ingredient = await this._ingredientService.create(createDto);
    return {
      message: 'Ingrediente creado exitosamente',
      statusCode: HttpStatus.CREATED,
      data: ingredient,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Actualizar un ingrediente' })
  @ApiOkResponse({ description: 'Ingrediente actualizado' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIngredientDto,
  ) {
    const ingredient = await this._ingredientService.update(
      parseInt(id),
      updateDto,
    );
    return {
      message: 'Ingrediente actualizado exitosamente',
      statusCode: HttpStatus.OK,
      data: ingredient,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Obtener todos los ingredientes activos' })
  @ApiOkResponse({ description: 'Lista de ingredientes' })
  async findAll() {
    const ingredients = await this._ingredientService.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: ingredients,
    };
  }

  @Get('paginated')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Obtener ingredientes paginados con filtros' })
  @ApiOkResponse({ description: 'Lista paginada de ingredientes' })
  async findPaginated(@Query() params: PaginatedListIngredientsParamsDto) {
    const result = await this._ingredientService.findPaginated(params);
    return {
      statusCode: HttpStatus.OK,
      data: result.data,
      total: result.total,
      page: params.page || 1,
      perPage: params.perPage || 10,
    };
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Obtener ingredientes con stock bajo' })
  @ApiOkResponse({ description: 'Ingredientes con stock por debajo del mínimo' })
  async findLowStock() {
    const ingredients = await this._ingredientService.findLowStock();
    return {
      statusCode: HttpStatus.OK,
      data: ingredients,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Obtener un ingrediente por ID' })
  @ApiOkResponse({ description: 'Ingrediente encontrado' })
  async findOne(@Param('id') id: string) {
    const ingredient = await this._ingredientService.findOne(parseInt(id));
    return {
      statusCode: HttpStatus.OK,
      data: ingredient,
    };
  }

  @Post(':id/adjust-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Ajustar stock de un ingrediente',
    description:
      'Suma o resta stock. Usar cantidad positiva para agregar, negativa para reducir.',
  })
  @ApiOkResponse({ description: 'Stock ajustado' })
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustDto: AdjustStockDto,
  ) {
    const ingredient = await this._ingredientService.adjustStock(
      parseInt(id),
      adjustDto,
    );
    return {
      message: 'Stock ajustado exitosamente',
      statusCode: HttpStatus.OK,
      data: ingredient,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Eliminar un ingrediente (soft delete)' })
  @ApiOkResponse({ description: 'Ingrediente eliminado' })
  async delete(@Param('id') id: string) {
    await this._ingredientService.delete(parseInt(id));
    return {
      message: 'Ingrediente eliminado exitosamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Desactivar un ingrediente' })
  @ApiOkResponse({ description: 'Ingrediente desactivado' })
  async deactivate(@Param('id') id: string) {
    const ingredient = await this._ingredientService.deactivate(parseInt(id));
    return {
      message: 'Ingrediente desactivado',
      statusCode: HttpStatus.OK,
      data: ingredient,
    };
  }

  @Patch(':id/activate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Activar un ingrediente' })
  @ApiOkResponse({ description: 'Ingrediente activado' })
  async activate(@Param('id') id: string) {
    const ingredient = await this._ingredientService.activate(parseInt(id));
    return {
      message: 'Ingrediente activado',
      statusCode: HttpStatus.OK,
      data: ingredient,
    };
  }
}
