import { IngredientRepository } from './../../shared/repositories/ingredient.repository';
import { Ingredient } from './../../shared/entities/ingredient.entity';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  AdjustStockDto,
} from './../dtos/ingredient.dto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedListIngredientsParamsDto } from '../dtos/crudIngredient.dto';
import { LessThan } from 'typeorm';

@Injectable()
export class IngredientService {
  constructor(
    private readonly _ingredientRepository: IngredientRepository,
  ) {}

  /**
   * Crear un nuevo ingrediente
   */
  async create(createIngredientDto: CreateIngredientDto): Promise<Ingredient> {
    try {
      const newIngredient = this._ingredientRepository.create(
        createIngredientDto,
      );
      return await this._ingredientRepository.save(newIngredient);
    } catch (error) {
      console.error('Error creando ingrediente:', error);
      throw new BadRequestException('No se pudo crear el ingrediente');
    }
  }

  /**
   * Actualizar un ingrediente existente
   */
  async update(
    ingredientId: number,
    updateIngredientDto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    const ingredient = await this._ingredientRepository.findOne({
      where: { ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingrediente con ID ${ingredientId} no encontrado`,
      );
    }

    Object.assign(ingredient, updateIngredientDto);

    return await this._ingredientRepository.save(ingredient);
  }

  /**
   * Obtener un ingrediente por ID
   */
  async findOne(ingredientId: number): Promise<Ingredient> {
    const ingredient = await this._ingredientRepository.findOne({
      where: { ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingrediente con ID ${ingredientId} no encontrado`,
      );
    }

    return ingredient;
  }

  /**
   * Obtener todos los ingredientes activos
   */
  async findAll(): Promise<Ingredient[]> {
    return await this._ingredientRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Obtener ingredientes con paginación y filtros
   */
  async findPaginated(
    params: PaginatedListIngredientsParamsDto,
  ): Promise<{ data: Ingredient[]; total: number }> {
    const { page = 1, perPage = 10, name, unit, isActive, lowStock } = params;
    const skip = (page - 1) * perPage;

    const queryBuilder =
      this._ingredientRepository.createQueryBuilder('ingredient');

    // Filtrar por nombre
    if (name) {
      queryBuilder.andWhere('ingredient.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    // Filtrar por unidad
    if (unit) {
      queryBuilder.andWhere('ingredient.unit = :unit', { unit });
    }

    // Filtrar por estado activo
    if (isActive !== undefined) {
      queryBuilder.andWhere('ingredient.isActive = :isActive', { isActive });
    }

    // Filtrar por stock bajo (amount < minStock)
    if (lowStock === true) {
      queryBuilder.andWhere('ingredient.amount < ingredient.minStock');
    }

    // Paginación
    queryBuilder.skip(skip).take(perPage).orderBy('ingredient.name', 'ASC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Obtener ingredientes con stock bajo
   */
  async findLowStock(): Promise<Ingredient[]> {
    const queryBuilder =
      this._ingredientRepository.createQueryBuilder('ingredient');

    queryBuilder
      .where('ingredient.amount < ingredient.minStock')
      .andWhere('ingredient.isActive = :isActive', { isActive: true })
      .orderBy('ingredient.amount', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Ajustar stock de un ingrediente (sumar o restar)
   * @param ingredientId ID del ingrediente
   * @param adjustStockDto Cantidad a ajustar (positivo para sumar, negativo para restar)
   */
  async adjustStock(
    ingredientId: number,
    adjustStockDto: AdjustStockDto,
  ): Promise<Ingredient> {
    const ingredient = await this.findOne(ingredientId);
    const { quantity, reason } = adjustStockDto;

    const newAmount = Number(ingredient.amount) + Number(quantity);

    if (newAmount < 0) {
      throw new BadRequestException(
        `No hay suficiente stock. Disponible: ${ingredient.amount} ${ingredient.unit}, Requerido: ${Math.abs(quantity)} ${ingredient.unit}`,
      );
    }

    ingredient.amount = newAmount;

    console.log(
      `📦 Stock ajustado - ${ingredient.name}: ${quantity > 0 ? '+' : ''}${quantity} ${ingredient.unit} (Total: ${newAmount} ${ingredient.unit})${reason ? ` - Motivo: ${reason}` : ''}`,
    );

    return await this._ingredientRepository.save(ingredient);
  }

  /**
   * Reducir stock de un ingrediente
   * @param ingredientId ID del ingrediente
   * @param quantity Cantidad a reducir (debe ser positivo)
   */
  async reduceStock(
    ingredientId: number,
    quantity: number,
    reason?: string,
  ): Promise<Ingredient> {
    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    return await this.adjustStock(ingredientId, {
      quantity: -quantity,
      reason: reason || 'Uso en preparación de platos',
    });
  }

  /**
   * Aumentar stock de un ingrediente
   * @param ingredientId ID del ingrediente
   * @param quantity Cantidad a aumentar (debe ser positivo)
   */
  async addStock(
    ingredientId: number,
    quantity: number,
    reason?: string,
  ): Promise<Ingredient> {
    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    return await this.adjustStock(ingredientId, {
      quantity: quantity,
      reason: reason || 'Compra de proveedor',
    });
  }

  /**
   * Verificar si hay suficiente stock de un ingrediente
   */
  async checkAvailability(
    ingredientId: number,
    requiredQuantity: number,
  ): Promise<boolean> {
    const ingredient = await this.findOne(ingredientId);
    return Number(ingredient.amount) >= Number(requiredQuantity);
  }

  /**
   * Eliminar un ingrediente (soft delete)
   */
  async delete(ingredientId: number): Promise<void> {
    const ingredient = await this.findOne(ingredientId);

    // Verificar si el ingrediente está siendo usado en recetas
    if (ingredient.recipes && ingredient.recipes.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el ingrediente porque está siendo usado en recetas',
      );
    }

    await this._ingredientRepository.softDelete(ingredientId);
  }

  /**
   * Desactivar un ingrediente (mantiene en BD pero no se usa)
   */
  async deactivate(ingredientId: number): Promise<Ingredient> {
    return await this.update(ingredientId, { isActive: false });
  }

  /**
   * Activar un ingrediente
   */
  async activate(ingredientId: number): Promise<Ingredient> {
    return await this.update(ingredientId, { isActive: true });
  }
}
