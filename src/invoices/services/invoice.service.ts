import { User } from './../../shared/entities/user.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { CreateInvoiceDetailDto } from './../dtos/invoiceDetaill.dto';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';
import { Product } from './../../shared/entities/product.entity';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In } from 'typeorm';

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
    // Obtenemos el tipo de factura
    const invoiceType = await this._invoiceTypeRepository.findOne({
      where: { invoiceTypeId: createInvoiceDto.invoiceTypeId },
    });

    if (!invoiceType) {
      throw new BadRequestException('Tipo de factura no encontrado');
    }

    // Obtenemos el usuario
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
        const lastInvoice = await manager
          .getRepository(Invoice)
          .createQueryBuilder('invoice')
          .leftJoin('invoice.invoiceType', 'invoiceType')
          .where('invoiceType.invoiceTypeId = :typeId', {
            typeId: createInvoiceDto.invoiceTypeId,
          })
          .orderBy('invoice.invoiceId', 'DESC')
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
        };

        const newInvoice = invoiceRepo.create(invoiceData);
        const saved = await invoiceRepo.save(newInvoice);

        return saved;
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

    // 🔹 Calcular suma de impuestos
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

      // Actualiza los campos solo si están definidos en el DTO
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

      // ⭐ ¡Añade esta línea para actualizar observations! ⭐
      if (observations !== undefined) {
        invoice.observations = observations;
      }

      if (updateInvoiceDto.cash !== undefined)
        invoice.cash = updateInvoiceDto.cash;
      if (updateInvoiceDto.transfer !== undefined)
        invoice.transfer = updateInvoiceDto.transfer;

      await queryRunner.manager.save(invoice);
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

      for (const detail of invoice.invoiceDetails) {
        // ✅ Revertir stock si es producto
        if (detail.product) {
          hasProducts = true;
          const product = await queryRunner.manager.findOneOrFail(Product, {
            where: { productId: detail.product.productId },
          });

          const currentAmount = Number(product.amount ?? 0);
          const detailAmount = Number(detail.amount ?? 0);

          if (isNaN(currentAmount) || isNaN(detailAmount)) {
            throw new Error(
              `Stock inválido: product.amount=${product.amount}, detail.amount=${detail.amount}`,
            );
          }

          if (isCompra) {
            product.amount = currentAmount - detailAmount;
          } else if (isVenta) {
            product.amount = currentAmount + detailAmount;
          }

          await queryRunner.manager.save(product);
        }

        // ✅ Liberar habitación si existe
        if (detail.accommodation && disponibleState) {
          detail.accommodation.stateType = disponibleState;
          await queryRunner.manager.save(detail.accommodation);
        }
      }

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
}
