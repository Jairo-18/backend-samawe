import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { RecipeService } from './../../recipes/services/recipe.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';

@Injectable()
export class RestaurantOrderService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceDetailRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _recipeService: RecipeService,
  ) {}

  /**
   * Cambiar el estado de un plato de la orden
   * Esta es la función CLAVE que reduce stock automáticamente
   *
   * @param invoiceDetailId ID del detalle de factura (plato)
   * @param newStateCode Código del nuevo estado: PENDING, COOKING, READY, SERVED, CANCELLED
   */
  async updateDishState(
    invoiceDetailId: number,
    newStateCode: string,
  ): Promise<InvoiceDetaill> {
    // 1. Obtener el plato (InvoiceDetail)
    const dish = await this._invoiceDetailRepository.findOne({
      where: { invoiceDetailId },
      relations: ['product', 'stateType', 'invoice'],
    });

    if (!dish) {
      throw new NotFoundException(
        `Plato con ID ${invoiceDetailId} no encontrado`,
      );
    }

    if (!dish.product) {
      throw new BadRequestException('Este item no es un plato del restaurante');
    }

    // 2. Obtener el nuevo estado
    const newState = await this._stateTypeRepository.findOne({
      where: { code: newStateCode },
    });

    if (!newState) {
      throw new NotFoundException(
        `Estado con código ${newStateCode} no encontrado`,
      );
    }

    const oldStateCode = dish.stateType?.code || 'NINGUNO';

    // 3. 🔥 LÓGICA CRÍTICA: Reducir stock cuando se empieza a cocinar
    if (newStateCode === 'COOKING' && oldStateCode !== 'COOKING') {
      console.log(
        `🍳 Iniciando preparación de ${dish.product.name} - Reduciendo ingredientes...`,
      );

      try {
        // Aquí es donde se reduce el stock automáticamente!
        await this._recipeService.consumeIngredients(
          dish.product.productId,
          Number(dish.amount) || 1, // Cantidad de porciones
        );

        // Registrar hora en que se empezó a cocinar
        dish.orderTime = dish.orderTime || new Date();
      } catch (error) {
        throw new BadRequestException(
          `No se puede iniciar la preparación: ${error.message}`,
        );
      }
    }

    // 4. Registrar tiempos según el estado
    if (newStateCode === 'READY' && oldStateCode !== 'READY') {
      dish.readyTime = new Date();
      console.log(`✅ Plato listo: ${dish.product.name}`);
    }

    if (newStateCode === 'SERVED' && oldStateCode !== 'SERVED') {
      dish.servedTime = new Date();
      console.log(`🍽️ Plato servido: ${dish.product.name}`);
    }

    // 5. Actualizar estado
    dish.stateType = newState;

    const updatedDish = await this._invoiceDetailRepository.save(dish);

    console.log(
      `📝 Estado actualizado: ${dish.product.name} - ${oldStateCode} → ${newStateCode}`,
    );

    return updatedDish;
  }

  /**
   * Cambiar estado de múltiples platos a la vez (por ejemplo, toda una mesa)
   */
  async updateMultipleDishesState(
    invoiceDetailIds: number[],
    newStateCode: string,
  ): Promise<InvoiceDetaill[]> {
    const updatedDishes: InvoiceDetaill[] = [];

    for (const id of invoiceDetailIds) {
      try {
        const updated = await this.updateDishState(id, newStateCode);
        updatedDishes.push(updated);
      } catch (error) {
        console.error(`Error actualizando plato ${id}:`, error.message);
        // Continuar con los demás aunque uno falle
      }
    }

    return updatedDishes;
  }

  /**
   * Cambiar estado general de una orden completa (Invoice)
   */
  async updateOrderState(
    invoiceId: number,
    newStateCode: string,
  ): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Orden con ID ${invoiceId} no encontrada`);
    }

    const newState = await this._stateTypeRepository.findOne({
      where: { code: newStateCode },
    });

    if (!newState) {
      throw new NotFoundException(
        `Estado con código ${newStateCode} no encontrado`,
      );
    }

    invoice.stateType = newState;
    await this._invoiceRepository.save(invoice);

    console.log(
      `📋 Estado de orden ${invoiceId} actualizado a ${newStateCode}`,
    );
  }

  /**
   * Verificar si todos los platos de una orden están listos
   */
  async checkIfOrderReady(invoiceId: number): Promise<boolean> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['invoiceDetails', 'invoiceDetails.stateType'],
    });

    if (!invoice || !invoice.invoiceDetails) {
      return false;
    }

    const allReady = invoice.invoiceDetails.every(
      (detail) =>
        detail.stateType?.code === 'READY' ||
        detail.stateType?.code === 'SERVED',
    );

    return allReady;
  }

  /**
   * Obtener órdenes pendientes de cocina
   */
  async getPendingOrders(): Promise<InvoiceDetaill[]> {
    const pendingState = await this._stateTypeRepository.findOne({
      where: { code: 'PENDING' },
    });

    if (!pendingState) {
      return [];
    }

    return await this._invoiceDetailRepository.find({
      where: { stateType: { stateTypeId: pendingState.stateTypeId } },
      relations: ['product', 'invoice'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Obtener platos en preparación
   */
  async getCookingOrders(): Promise<InvoiceDetaill[]> {
    const cookingState = await this._stateTypeRepository.findOne({
      where: { code: 'COOKING' },
    });

    if (!cookingState) {
      return [];
    }

    return await this._invoiceDetailRepository.find({
      where: { stateType: { stateTypeId: cookingState.stateTypeId } },
      relations: ['product', 'invoice'],
      order: { orderTime: 'ASC' },
    });
  }

  /**
   * Obtener platos listos para servir
   */
  async getReadyOrders(): Promise<InvoiceDetaill[]> {
    const readyState = await this._stateTypeRepository.findOne({
      where: { code: 'READY' },
    });

    if (!readyState) {
      return [];
    }

    return await this._invoiceDetailRepository.find({
      where: { stateType: { stateTypeId: readyState.stateTypeId } },
      relations: ['product', 'invoice'],
      order: { readyTime: 'ASC' },
    });
  }

  /**
   * Cancelar un plato (NO restaura ingredientes ya consumidos)
   */
  async cancelDish(invoiceDetailId: number): Promise<InvoiceDetaill> {
    const dish = await this._invoiceDetailRepository.findOne({
      where: { invoiceDetailId },
      relations: ['stateType'],
    });

    if (!dish) {
      throw new NotFoundException(
        `Plato con ID ${invoiceDetailId} no encontrado`,
      );
    }

    // Si ya se empezó a cocinar, advertir que no se restaurará stock
    if (
      dish.stateType?.code === 'COOKING' ||
      dish.stateType?.code === 'READY'
    ) {
      console.warn(
        `⚠️ ADVERTENCIA: Plato ${invoiceDetailId} ya fue cocinado. Los ingredientes NO serán restaurados.`,
      );
    }

    return await this.updateDishState(invoiceDetailId, 'CANCELLED');
  }
}
