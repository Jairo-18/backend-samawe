import { User } from './../../shared/entities/user.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { OrdersGateway } from './../../socket/gateways/orders.gateway';
import { RecipeService } from './../../recipes/services/recipe.service';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { CreateInvoiceDetailDto } from './../dtos/invoiceDetaill.dto';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';
import { Product } from './../../shared/entities/product.entity';
import {
  Notification,
  NotificationType,
} from './../../shared/entities/notification.entity';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Invoice } from './../../shared/entities/invoice.entity';
import { PaidType } from './../../shared/entities/paidType.entity';
import { PayType } from './../../shared/entities/payType.entity';
import { PaidTypeRepository } from './../../shared/repositories/paidType.repository';
import { PayTypeRepository } from './../../shared/repositories/payType.repository';
import { UserRepository } from './../../shared/repositories/user.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { InvoiceTypeRepository } from './../../shared/repositories/invoiceType.repository';
import {
  CreateInvoiceDto,
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { In, EntityManager } from 'typeorm';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _payTypeRepository: PayTypeRepository,
    private readonly _paidTypeRepository: PaidTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _userRepository: UserRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _eventEmitter: EventEmitter2,
    private readonly _ordersGateway: OrdersGateway,
    private readonly _recipeService: RecipeService,
  ) {}

  private toDateOnly(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private async _calculateInvoiceDetails(
    detailsDto: CreateInvoiceDetailDto[],
  ): Promise<{
    details: InvoiceDetaill[];
    total: number;
    subtotalWithTax: number;
    subtotalWithoutTax: number;
    hasProducts: boolean;
  }> {
    const details: InvoiceDetaill[] = [];
    let subtotalWithoutTax = 0;
    let subtotalWithTax = 0;
    let total = 0;
    let hasProducts = false;

    for (const detailDto of detailsDto) {
      let taxRate = 0;
      let taxeType = null;

      if (detailDto.taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: detailDto.taxeTypeId },
        });
        if (!taxeType) {
          throw new NotFoundException('Tipo de impuesto no encontrado');
        }
        taxRate =
          taxeType.percentage > 1
            ? taxeType.percentage / 100
            : taxeType.percentage;
      }

      const amount = Number(detailDto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }

      let priceBuy = 0;
      let priceWithoutTax = 0;
      let priceWithTax = 0;
      let detailSubtotal = 0;

      if (detailDto.productId) {
        const product = await this._productRepository.findOne({
          where: { productId: detailDto.productId },
        });
        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        priceBuy =
          detailDto.priceBuy !== undefined
            ? Number(detailDto.priceBuy)
            : Number(product.priceBuy);

        priceWithoutTax =
          detailDto.priceWithoutTax !== undefined
            ? Number(detailDto.priceWithoutTax)
            : Number(product.priceSale);

        hasProducts = true;
      } else {
        priceBuy = Number(detailDto.priceBuy) || 0;
        priceWithoutTax = Number(detailDto.priceWithoutTax) || 0;
      }

      priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
      detailSubtotal = Number((amount * priceWithTax).toFixed(2));

      const detail = this._invoiceDetaillRepository.create({
        amount,
        priceBuy,
        priceWithoutTax,
        priceWithTax,
        subtotal: detailSubtotal,
        taxeType,
        startDate: detailDto.startDate,
        endDate: detailDto.endDate,
      });

      if (detailDto.productId) {
        const product = await this._productRepository.findOne({
          where: { productId: detailDto.productId },
        });
        detail.product = product;
      }

      if (detailDto.accommodationId) {
        const accommodation = await this._accommodationRepository.findOne({
          where: { accommodationId: detailDto.accommodationId },
        });
        if (!accommodation) {
          throw new NotFoundException('Hospedaje no encontrado');
        }
        detail.accommodation = accommodation;
      }

      if (detailDto.excursionId) {
        const excursion = await this._excursionRepository.findOne({
          where: { excursionId: detailDto.excursionId },
        });
        if (!excursion) {
          throw new NotFoundException('Excursión no encontrada');
        }
        detail.excursion = excursion;
      }

      details.push(detail);

      const lineSubtotalWithoutTax = amount * priceWithoutTax;
      const lineSubtotalWithTax = amount * priceWithTax;
      const taxAmount = lineSubtotalWithTax - lineSubtotalWithoutTax;

      subtotalWithoutTax += lineSubtotalWithoutTax;
      subtotalWithTax += taxAmount;
      total += lineSubtotalWithTax;
    }

    subtotalWithoutTax = Math.round(subtotalWithoutTax * 100) / 100;
    subtotalWithTax = Math.round(subtotalWithTax * 100) / 100;
    total = Math.round(total * 100) / 100;

    return {
      details,
      total,
      subtotalWithTax,
      subtotalWithoutTax,
      hasProducts,
    };
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    employeeId: string,
  ): Promise<Invoice> {
    const invoiceType = await this._invoiceTypeRepository.findOne({
      where: { invoiceTypeId: createInvoiceDto.invoiceTypeId },
    });

    if (!invoiceType) {
      throw new BadRequestException('Tipo de factura no encontrado');
    }

    const user = await this._userRepository.findOne({
      where: { userId: createInvoiceDto.userId },
    });

    if (!user) throw new BadRequestException('Cliente no encontrado');

    if (!user.isActive) {
      throw new BadRequestException('Este usuario está inactivo');
    }

    const [payType, paidType] = await Promise.all([
      createInvoiceDto.payTypeId
        ? this._payTypeRepository.findOne({
            where: { payTypeId: createInvoiceDto.payTypeId },
          })
        : null,
      createInvoiceDto.paidTypeId
        ? this._paidTypeRepository.findOne({
            where: { paidTypeId: createInvoiceDto.paidTypeId },
          })
        : null,
    ]);

    const invoiceEntity = await this._invoiceRepository.manager.transaction(
      async (manager) => {
        await manager.query(`SELECT pg_advisory_xact_lock($1)`, [
          createInvoiceDto.invoiceTypeId,
        ]);

        const lastInvoice = await manager
          .getRepository(Invoice)
          .createQueryBuilder('invoice')
          .leftJoin('invoice.invoiceType', 'invoiceType')
          .where('invoiceType.invoiceTypeId = :typeId', {
            typeId: createInvoiceDto.invoiceTypeId,
          })
          .orderBy('CAST(invoice.code AS INTEGER)', 'DESC')
          .getOne();

        let nextNumber = 1;
        if (lastInvoice?.code) {
          const parsed = parseInt(lastInvoice.code, 10);
          if (!isNaN(parsed)) {
            nextNumber = parsed + 1;
          }
        }

        const code = nextNumber.toString().padStart(5, '0');

        const {
          details: invoiceDetails,
          total,
          subtotalWithTax,
          subtotalWithoutTax,
        } = await this._calculateInvoiceDetails(createInvoiceDto.details ?? []);

        const invoiceRepo = manager.getRepository(Invoice);

        const invoiceData: Partial<Invoice> = {
          code,
          observations: createInvoiceDto.observations,
          invoiceElectronic: createInvoiceDto.invoiceElectronic,
          startDate: this.toDateOnly(createInvoiceDto.startDate),
          endDate: this.toDateOnly(createInvoiceDto.endDate),

          subtotalWithoutTax,
          subtotalWithTax,
          total,
          transfer: createInvoiceDto.transfer || 0,
          cash: createInvoiceDto.cash || 0,
          invoiceDetails,
          invoiceType,
          user,
          employee: { userId: employeeId } as User,
          payType: payType ?? undefined,
          paidType: paidType ?? undefined,
          stateType: createInvoiceDto.stateTypeId
            ? ({ stateTypeId: createInvoiceDto.stateTypeId } as StateType)
            : undefined,
          tableNumber: createInvoiceDto.tableNumber,
        };

        const newInvoice = invoiceRepo.create(invoiceData);
        try {
          const saved = await invoiceRepo.save(newInvoice);
          return saved;
        } catch (error) {
          if (
            error?.code === '23505' &&
            error?.constraint === 'UQ_invoice_code_per_type'
          ) {
            throw new ConflictException(
              `Ya existe una factura con el código ${code} para este tipo. Intente nuevamente.`,
            );
          }
          throw error;
        }
      },
    );

    return invoiceEntity;
  }

  async findOne(invoiceId: number): Promise<GetInvoiceWithDetailsDto> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'invoiceType',
        'payType',
        'paidType',
        'stateType',
        'user',
        'employee',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.accommodation',
        'invoiceDetails.excursion',
        'user.phoneCode',
        'user.identificationType',
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    const { totalTaxes } = await this._invoiceDetaillRepository
      .createQueryBuilder('d')
      .select(
        'COALESCE(SUM((d.priceWithTax - d.priceWithoutTax) * d.amount), 0)',
        'totalTaxes',
      )
      .where('d.invoiceId = :invoiceId', { invoiceId })
      .getRawOne();

    return {
      invoiceId: invoice.invoiceId,
      code: invoice.code,
      observations: invoice.observations,
      invoiceElectronic: invoice.invoiceElectronic,
      subtotalWithoutTax: invoice.subtotalWithoutTax?.toString(),
      subtotalWithTax: invoice.subtotalWithTax?.toString(),
      cash: invoice.cash,
      transfer: invoice.transfer,
      total: invoice.total?.toString(),
      totalTaxes: Number(totalTaxes),
      tableNumber: invoice.tableNumber,
      orderTime: invoice.orderTime?.toISOString(),
      readyTime: invoice.readyTime?.toISOString(),
      servedTime: invoice.servedTime?.toISOString(),
      invoiceType: invoice.invoiceType && {
        invoiceTypeId: invoice.invoiceType.invoiceTypeId,
        code: invoice.invoiceType.code,
        name: invoice.invoiceType.name,
      },
      payType: invoice.payType && {
        payTypeId: invoice.payType.payTypeId,
        code: invoice.payType.code,
        name: invoice.payType.name,
      },
      paidType: invoice.paidType && {
        paidTypeId: invoice.paidType.paidTypeId,
        code: invoice.paidType.code,
        name: invoice.paidType.name,
      },
      stateType: invoice.stateType && {
        stateTypeId: invoice.stateType.stateTypeId,
        code: invoice.stateType.code,
        name: invoice.stateType.name,
      },
      user: invoice.user && {
        userId: invoice.user.userId,
        firstName: invoice.user.firstName,
        lastName: invoice.user.lastName,
        identificationNumber: invoice.user.identificationNumber,
        identificationType: invoice.user.identificationType && {
          identificationTypeId: Number(
            invoice.user.identificationType.identificationTypeId,
          ),
          code: invoice.user.identificationType.code,
          name: invoice.user.identificationType.name,
        },
      },
      employee: invoice.employee && {
        userId: invoice.employee.userId,
        firstName: invoice.employee.firstName,
        lastName: invoice.employee.lastName,
        identificationNumber: invoice.employee.identificationNumber,
      },
      invoiceDetails: invoice.invoiceDetails.map((detail) => ({
        invoiceDetailId: detail.invoiceDetailId,
        amount: Number(detail.amount),
        priceWithoutTax: detail.priceWithoutTax?.toString(),
        priceWithTax: detail.priceWithTax?.toString(),
        subtotal: detail.subtotal?.toString(),
        product: detail.product && {
          productId: detail.product.productId,
          name: detail.product.name,
          code: detail.product.code,
        },
        accommodation: detail.accommodation && {
          accommodationId: detail.accommodation.accommodationId,
          name: detail.accommodation.name,
          code: detail.accommodation.code,
        },
        excursion: detail.excursion && {
          excursionId: detail.excursion.excursionId,
          name: detail.excursion.name,
          code: detail.excursion.code,
        },
        startDate: detail.startDate,
        endDate: detail.endDate,
        isPaid: detail.isPaid,
      })),
    };
  }

  async update(
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<GetInvoiceWithDetailsDto> {
    const {
      invoiceId,
      payTypeId,
      paidTypeId,
      invoiceElectronic,

      observations,
    } = updateInvoiceDto;

    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { invoiceId },
        relations: ['payType', 'paidType'],
      });

      if (!invoice) {
        throw new NotFoundException('Factura no encontrada');
      }

      if (payTypeId !== undefined) {
        const payType = await queryRunner.manager.findOne(PayType, {
          where: { payTypeId },
        });
        if (!payType) {
          throw new BadRequestException('Tipo de pago no válido');
        }
        invoice.payType = payType;
      }

      if (paidTypeId !== undefined) {
        const paidType = await queryRunner.manager.findOne(PaidType, {
          where: { paidTypeId },
        });
        if (!paidType) {
          throw new BadRequestException('Estado de pago no válido');
        }
        invoice.paidType = paidType;
      }

      if (invoiceElectronic !== undefined) {
        invoice.invoiceElectronic = invoiceElectronic;
      }

      if (observations !== undefined) {
        invoice.observations = observations;
      }

      if (updateInvoiceDto.cash !== undefined)
        invoice.cash = updateInvoiceDto.cash;
      if (updateInvoiceDto.transfer !== undefined)
        invoice.transfer = updateInvoiceDto.transfer;

      if (updateInvoiceDto.stateTypeId !== undefined) {
        const stateType = await queryRunner.manager.findOne(StateType, {
          where: { stateTypeId: updateInvoiceDto.stateTypeId },
        });
        if (!stateType) {
          throw new BadRequestException('Estado de factura no válido');
        }
        invoice.stateType = stateType;

        const now = new Date();
        const stateCode = stateType.code?.toUpperCase();

        if (stateCode === 'ENC') {
          invoice.orderTime = now;
        } else if (stateCode === 'ENT') {
          invoice.readyTime = now;
        }
      }

      await queryRunner.manager.save(invoice);

      if (updateInvoiceDto.stateTypeId !== undefined) {
        const notificationStates = ['ENC', 'ENT'];

        if (
          invoice.stateType?.code &&
          notificationStates.includes(invoice.stateType.code.toUpperCase())
        ) {
          const title = `Actualización de Orden`;
          const message = `La orden de la mesa ${invoice.tableNumber || 'N/A'} (Factura ${invoice.code}) cambió a ${invoice.stateType.name}.`;
          await this._sendOrderNotification(
            queryRunner.manager,
            invoice,
            title,
            message,
          );
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(invoiceId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(invoiceId: number): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'invoiceType',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.stateType',
      ],
      withDeleted: true,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const isCompra = invoice.invoiceType.code === 'FC';
      const isVenta = invoice.invoiceType.code === 'FV';
      let hasProducts = false;

      const disponibleState = await queryRunner.manager.findOne(StateType, {
        where: {
          name: In(['Disponible', 'DISPONIBLE']),
        },
      });

      const productIds: number[] = [];
      const recipeProductIdsToRestore: { id: number; amount: number }[] = [];

      for (const detail of invoice.invoiceDetails) {
        if (detail.product) {
          hasProducts = true;
          productIds.push(detail.product.productId);
        }
      }

      const productsMap = new Map<number, Product>();
      if (productIds.length > 0) {
        const allProducts = await queryRunner.manager.find(Product, {
          where: { productId: In(productIds) },
          relations: ['categoryType'],
        });
        for (const p of allProducts) {
          productsMap.set(p.productId, p);
        }
      }

      const changedProducts: Product[] = [];
      const changedAccommodations = [];

      for (const detail of invoice.invoiceDetails) {
        if (detail.product) {
          const product = productsMap.get(detail.product.productId);
          if (!product) {
            throw new Error(
              `Producto ${detail.product.productId} no encontrado`,
            );
          }

          const currentAmount = Number(product.amount ?? 0);
          const detailAmount = Number(detail.amount ?? 0);

          if (isNaN(currentAmount) || isNaN(detailAmount)) {
            throw new Error(
              `Stock inválido: product.amount=${product.amount}, detail.amount=${detail.amount}`,
            );
          }

          const categoryCode = product.categoryType?.code?.toUpperCase();
          const isRecipeProduct = ['RES'].includes(categoryCode);

          let productChanged = false;

          if (isCompra) {
            product.amount = currentAmount - detailAmount;
            productChanged = true;
          } else if (isVenta) {
            if (isRecipeProduct) {
              recipeProductIdsToRestore.push({
                id: product.productId,
                amount: detailAmount,
              });
            } else {
              product.amount = currentAmount + detailAmount;
              productChanged = true;
            }
          } else {
            productChanged = true;
          }

          if (productChanged) {
            changedProducts.push(product);
          }
        }

        if (detail.accommodation && disponibleState) {
          detail.accommodation.stateType = disponibleState;
          changedAccommodations.push(detail.accommodation);
        }
      }

      const saveOps: Promise<any>[] = [];

      if (changedProducts.length > 0) {
        saveOps.push(queryRunner.manager.save(changedProducts));
      }
      if (changedAccommodations.length > 0) {
        saveOps.push(queryRunner.manager.save(changedAccommodations));
      }

      for (const recipe of recipeProductIdsToRestore) {
        saveOps.push(
          this._recipeService.restoreIngredients(
            recipe.id,
            recipe.amount,
            new Set(),
          ),
        );
      }

      await Promise.all(saveOps);

      await queryRunner.manager.delete(InvoiceDetaill, {
        invoice: { invoiceId },
      });

      await queryRunner.manager.delete(Invoice, { invoiceId });

      await queryRunner.commitTransaction();

      this._eventEmitter.emit('invoice.deleted', { invoice, hasProducts });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async _sendOrderNotification(
    manager: EntityManager,
    invoice: Invoice,
    title: string,
    message: string,
  ) {
    const roleNames = [
      'ADMINISTRADOR',
      'Administrador',
      'MESERO',
      'Mesero',
      'CHEF',
      'Chef',
      'RECEPCIONISTA',
      'Recepcionista',
    ];
    const usersToNotify = await manager.find(User, {
      where: {
        roleType: {
          name: In(roleNames),
        },
      },
      relations: ['roleType'],
    });

    if (usersToNotify.length > 0) {
      const notificationsToInsert = usersToNotify.map((user) => {
        const notif = new Notification();
        notif.title = title;
        notif.message = message;
        notif.type = NotificationType.ORDER_STATE_CHANGED;
        notif.user = user;
        notif.metadata = {
          invoiceId: invoice.invoiceId,
          code: invoice.code,
          tableNumber: invoice.tableNumber,
          state: invoice.stateType.name,
          stateCode: invoice.stateType.code,
          orderTime: invoice.orderTime,
          readyTime: invoice.readyTime,
          servedTime: invoice.servedTime,
        };
        return notif;
      });

      await manager.save(Notification, notificationsToInsert);

      for (const notif of notificationsToInsert) {
        this._ordersGateway.emitToUser(notif.user.userId, {
          notificationId: notif.notificationId,
          invoiceId: invoice.invoiceId,
          code: invoice.code,
          state: invoice.stateType.name,
          stateCode: invoice.stateType.code,
          tableNumber: invoice.tableNumber,
          updatedAt: new Date(),
          orderTime: invoice.orderTime,
          readyTime: invoice.readyTime,
          servedTime: invoice.servedTime,
        });
      }
    }
  }

  @OnEvent('invoice.recipe_item.added', { async: true })
  async handleRecipeItemAdded(payload: {
    invoiceId: number;
    productName: string;
  }) {
    await this._invoiceRepository.manager.transaction(async (manager) => {
      const invoice = await manager.findOne(Invoice, {
        where: { invoiceId: payload.invoiceId },
        relations: ['stateType'],
      });

      if (invoice && invoice.stateType?.code === 'ENC') {
        const title = `Plato añadido a la orden`;
        const message = `Mesa ${invoice.tableNumber || 'N/A'}: Se agegó un(a) ${payload.productName}.`;
        await this._sendOrderNotification(manager, invoice, title, message);
      }
    });
  }
}
