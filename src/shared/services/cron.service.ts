import { ProductRepository } from './../repositories/product.repository';
import { NotificationService } from './../../notifications/services/notification.service';
import { StateTypeRepository } from './../repositories/stateType.repository';
import { AccommodationRepository } from './../repositories/accommodation.repository';
import { InvoiceDetaillRepository } from './../repositories/invoiceDetaill.repository';
import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class CronService {
  constructor(
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _notificationService: NotificationService,
    private readonly _productRepository: ProductRepository,
  ) {}

  // Cron cada 6 horas (00:00, 06:00, 12:00, 18:00) en horario de Bogotá
  @Cron('*/10 * * * *', { timeZone: 'America/Bogota' })
  async handleExpiredAccommodations() {
    try {
      await this.updateExpiredAccommodations();
      await this.checkLowStockProducts(); // 🆕
    } catch (error) {
      console.error('❌ Error en cron general:', error.message);
    }
  }

  async updateExpiredAccommodations() {
    const now = new Date();

    const expiredDetails = await this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.accommodation', 'accommodation')
      .leftJoinAndSelect('accommodation.stateType', 'stateType')
      .where('detail.endDate < :now', { now })
      .andWhere('stateType.name = :state', { state: 'Ocupado' })
      .getMany();

    if (expiredDetails.length === 0) return { updated: 0 };

    const mantenimientoState = await this._stateTypeRepository.findOne({
      where: { name: 'Mantenimiento' },
    });

    if (!mantenimientoState) {
      throw new Error('No se encontró el estado "Mantenimiento"');
    }

    const accommodationsToUpdate = expiredDetails
      .map((detail) => detail.accommodation)
      .filter(
        (acc, index, self) =>
          self.findIndex((a) => a.accommodationId === acc.accommodationId) ===
          index,
      );

    accommodationsToUpdate.forEach((acc) => {
      acc.stateType = mantenimientoState;
    });

    await this._accommodationRepository.save(accommodationsToUpdate);

    for (const acc of accommodationsToUpdate) {
      await this._notificationService.notifyToRoles(
        NotificationType.ROOM_MAINTENANCE,
        'Hospedaje liberado',
        `El hospedaje "${acc.name}" fue desocupado. Debes enviar a mantenimiento.`,
        { accommodationId: acc.accommodationId },
      );
    }

    return {
      updated: accommodationsToUpdate.length,
      accommodations: accommodationsToUpdate.map((acc) => ({
        id: acc.accommodationId,
        name: acc.name || `Accommodation ${acc.accommodationId}`,
      })),
    };
  }

  private async checkLowStockProducts() {
    const threshold = 10;

    const products = await this._productRepository.find({
      where: { isActive: true },
    });

    const lowStock = products.filter((p) => (p.amount ?? 0) < threshold);

    for (const product of lowStock) {
      try {
        await this._notificationService.notifyToRoles(
          NotificationType.LOW_PRODUCT,
          'Producto con bajo stock',
          `El producto "${product.name}" tiene solo ${product.amount} unidades restantes.`,
          {
            productId: product.productId,
            productName: product.name,
            currentStock: product.amount,
            threshold,
          },
        );
      } catch (err) {
        console.error(
          `❌ Error notificando sobre stock bajo de ${product.name}:`,
          err.message,
        );
      }
    }

    return lowStock.length;
  }
}
