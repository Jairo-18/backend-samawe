import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { RecipeService } from './../../recipes/services/recipe.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class RestaurantOrderService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceDetailRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _recipeService: RecipeService,
  ) {}

  /**
   * Cambiar el estado de una orden completa
   * Esta es la función CLAVE que reduce stock automáticamente cuando el estado es COOKING
   *
   * @param invoiceId ID del detalle de factura (orden)
   * @param newStateCode Código del nuevo estado: PENDIENTE, EN COCINA, LISTO PARA SERVIR, ENTREGADO, CANCELADO
   */
  async updateOrderState(
    invoiceId: number,
    newStateCode: string,
  ): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['invoiceDetails', 'invoiceDetails.product', 'stateType'],
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

    const oldStateCode = invoice.stateType?.code || 'NINGUNO';

    if (newStateCode === 'EN COCINA' && oldStateCode !== 'EN COCINA') {
      console.log(
        `🍳 Iniciando preparación para orden ${invoiceId} - Reduciendo ingredientes...`,
      );

      try {
        for (const dish of invoice.invoiceDetails) {
          if (dish.product) {
            await this._recipeService.consumeIngredients(
              dish.product.productId,
              Number(dish.amount) || 1,
            );
          }
        }
        invoice.orderTime = invoice.orderTime || new Date();
      } catch (error) {
        throw new BadRequestException(
          `No se puede iniciar la preparación: ${error.message}`,
        );
      }
    }

    if (
      newStateCode === 'LISTO PARA SERVIR' &&
      oldStateCode !== 'LISTO PARA SERVIR'
    ) {
      invoice.readyTime = new Date();
      console.log(`✅ Orden ${invoiceId} lista para servir`);
    }

    if (newStateCode === 'ENTREGADO' && oldStateCode !== 'ENTREGADO') {
      invoice.servedTime = new Date();
      console.log(`🍽️ Orden ${invoiceId} entregada`);
    }

    invoice.stateType = newState;

    await this._invoiceRepository.save(invoice);

    console.log(
      `📝 Estado actualizado para orden ${invoiceId}: ${oldStateCode} → ${newStateCode}`,
    );
  }

  /**
   * Eliminar las funciones relacionadas a detalles individuales ya que el estado se maneja a nivel de orden.
   */

  /**
   * Cambiar estado de múltiples platos a la vez (por ejemplo, toda una mesa)
   */
  /**
   * Obtener órdenes pendientes de cocina
   */
  async getPendingOrders() {
    const pendingState = await this._stateTypeRepository.findOne({
      where: { code: 'PENDIENTE' },
    });

    if (!pendingState) {
      return [];
    }

    return await this._invoiceRepository.find({
      where: { stateType: { stateTypeId: pendingState.stateTypeId } },
      relations: ['invoiceDetails', 'invoiceDetails.product'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Obtener ordenes en preparación
   */
  async getCookingOrders() {
    const cookingState = await this._stateTypeRepository.findOne({
      where: { code: 'EN COCINA' },
    });

    if (!cookingState) {
      return [];
    }

    return await this._invoiceRepository.find({
      where: { stateType: { stateTypeId: cookingState.stateTypeId } },
      relations: ['invoiceDetails', 'invoiceDetails.product'],
      order: { orderTime: 'ASC' },
    });
  }

  /**
   * Obtener ordenes listos para servir
   */
  async getReadyOrders() {
    const readyState = await this._stateTypeRepository.findOne({
      where: { code: 'LISTO PARA SERVIR' },
    });

    if (!readyState) {
      return [];
    }

    return await this._invoiceRepository.find({
      where: { stateType: { stateTypeId: readyState.stateTypeId } },
      relations: ['invoiceDetails', 'invoiceDetails.product'],
      order: { readyTime: 'ASC' },
    });
  }

  async cancelOrder(invoiceId: number): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['stateType'],
    });

    if (!invoice) {
      throw new NotFoundException(`Orden con ID ${invoiceId} no encontrada`);
    }

    if (
      invoice.stateType?.code === 'EN COCINA' ||
      invoice.stateType?.code === 'LISTO PARA SERVIR'
    ) {
      console.warn(
        `⚠️ ADVERTENCIA: Orden ${invoiceId} ya fue cocinada. Los ingredientes NO serán restaurados.`,
      );
    }

    return await this.updateOrderState(invoiceId, 'CANCELADO');
  }
}
