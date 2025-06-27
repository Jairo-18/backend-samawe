import { ProductRepository } from './../../shared/repositories/product.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { ParamsPaginationDto } from 'src/shared/dtos/pagination.dto';
import { NotificationType } from './../../shared/entities/notification.entity';
import { NotificationRepository } from './../../shared/repositories/notification.repository';
import { UserService } from './../../user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PageMetaDto } from 'src/shared/dtos/pageMeta.dto';
import { In } from 'typeorm';

@Injectable()
export class NotificationService {
  constructor(
    private readonly _notificationRepository: NotificationRepository,
    private readonly _userService: UserService,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

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
      await this.notifyToRoles(
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

  async checkLowStockProducts() {
    const threshold = 10;

    const products = await this._productRepository.find({
      where: { isActive: true },
    });

    const lowStock = products.filter((p) => (p.amount ?? 0) < threshold);

    for (const product of lowStock) {
      await this.notifyToRoles(
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
    }

    return lowStock.length;
  }

  async notifyToRoles(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const users = await this._userService.findByRoles([
      'Empleado',
      'Administrador',
    ]);
    if (users.length === 0) return [];

    const userIds = users.map((user) => user.userId);
    const existingNotifications = await this._notificationRepository.find({
      where: {
        user: { userId: In(userIds) },
        type,
      },
      relations: ['user'],
    });

    const existingByUser = new Map();
    existingNotifications.forEach((notification) => {
      const userId = notification.user.userId;
      if (!existingByUser.has(userId)) {
        existingByUser.set(userId, []);
      }
      existingByUser.get(userId).push(notification);
    });

    const notifs = await Promise.all(
      users.map(async (user) => {
        const userNotifications = existingByUser.get(user.userId) || [];
        const exists = userNotifications.find(
          (notification) =>
            notification.metadata?.productId === metadata?.productId,
        );

        if (exists) {
          exists.message = message;
          exists.title = title;
          exists.read = false;
          exists.metadata = metadata;
          return this._notificationRepository.save(exists);
        }

        const newNotif = this._notificationRepository.create({
          user,
          type,
          title,
          message,
          metadata,
        });

        return this._notificationRepository.save(newNotif);
      }),
    );

    return notifs.filter(Boolean);
  }

  async getNotificationsForUser(userId: string) {
    return this._notificationRepository.find({
      where: { user: { userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAllAsRead(userId: string) {
    await this._notificationRepository.update(
      { user: { userId } },
      { read: true },
    );
  }

  async deleteNotification(notificationId: string) {
    await this._notificationRepository.delete(notificationId);
  }

  async deleteAllNotificationsForUser(userId: string) {
    await this._notificationRepository.delete({ user: { userId } });
  }

  async getNotificationsPaginated(
    userId: string,
    params: ParamsPaginationDto,
  ): Promise<ResponsePaginationDto<any>> {
    await this.updateExpiredAccommodations();
    await this.checkLowStockProducts();

    const { page = 1, perPage = 10, order = 'DESC' } = params;

    const [data, total] = await this._notificationRepository.findAndCount({
      where: { user: { userId } },
      order: { createdAt: order },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const pagination = new PageMetaDto({
      pageOptionsDto: params,
      itemCount: total,
    });

    return new ResponsePaginationDto(data, pagination);
  }
}
