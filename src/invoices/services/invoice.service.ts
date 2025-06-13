import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { CreateInvoiceDetailDto } from './../dtos/invoiceDetaill.dto';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';
import { BalanceService } from './../../shared/services/balance.service';
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
import { DataSource } from 'typeorm';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _payTypeRepository: PayTypeRepository,
    private readonly _paidTypeRepository: PaidTypeRepository,
    private readonly _invoiceDetailRepository: InvoiceDetaillRepository,
    private readonly _userRepository: UserRepository,
    private readonly _balanceService: BalanceService,
    private readonly _productRepository: ProductRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _dataSource: DataSource,
  ) {}

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

      const detail = this._invoiceDetailRepository.create({
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

  async create(dto: CreateInvoiceDto, employeeId: string): Promise<Invoice> {
    const [payType, paidType, invoiceType, user] = await Promise.all([
      this._payTypeRepository.findOne({ where: { payTypeId: dto.payTypeId } }),
      this._paidTypeRepository.findOne({
        where: { paidTypeId: dto.paidTypeId },
      }),
      this._invoiceTypeRepository.findOne({
        where: { invoiceTypeId: dto.invoiceTypeId },
      }),
      this._userRepository.findOne({ where: { userId: dto.userId } }),
    ]);

    if (!payType) throw new BadRequestException('Tipo de pago no encontrado');
    if (!paidType)
      throw new BadRequestException('Estado de pago no encontrado');
    if (!invoiceType)
      throw new BadRequestException('Tipo de factura no encontrado');
    if (!user) throw new BadRequestException('Cliente no encontrado');

    const { saved: invoiceEntity, hasProducts } =
      await this._invoiceRepository.manager.transaction(async (manager) => {
        const lastInvoice = await manager
          .getRepository(Invoice)
          .createQueryBuilder('invoice')
          .leftJoin('invoice.invoiceType', 'invoiceType')
          .where('invoiceType.invoiceTypeId = :typeId', {
            typeId: dto.invoiceTypeId,
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
          hasProducts,
        } = await this._calculateInvoiceDetails(dto.details ?? []);

        const invoiceRepo = manager.getRepository(Invoice);

        const newInvoice = invoiceRepo.create({
          code,
          invoiceElectronic: dto.invoiceElectronic,
          startDate: dto.startDate,
          endDate: dto.endDate,
          subtotalWithoutTax,
          subtotalWithTax,
          total,
          invoiceDetails,
          invoiceType,
          user,
          employee: { userId: employeeId },
          payType,
          paidType,
        });

        const saved = await invoiceRepo.save(newInvoice);
        return { saved, hasProducts };
      });

    await this._balanceService.updateBalanceWithInvoice(invoiceEntity);
    if (hasProducts) {
      await this._balanceService.updateBalanceWithCurrentProducts();
    }

    return invoiceEntity;
  }

  async delete(invoiceId: number): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['invoiceType', 'invoiceDetails', 'invoiceDetails.product'],
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

      for (const detail of invoice.invoiceDetails) {
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
      }

      await queryRunner.manager.delete(InvoiceDetaill, {
        invoice: { invoiceId },
      });

      await queryRunner.manager.delete(Invoice, { invoiceId });

      await queryRunner.commitTransaction();

      await this._balanceService.removeInvoiceFromBalance(invoice);

      if (hasProducts) {
        await this._balanceService.updateBalanceWithCurrentProducts();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
        'invoiceDetails.product.categoryType',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.bedType',
        'invoiceDetails.accommodation.categoryType',
        'invoiceDetails.excursion',
        'invoiceDetails.excursion.categoryType',
        'invoiceDetails.taxeType',
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return {
      invoiceId: invoice.invoiceId,
      code: invoice.code,
      invoiceElectronic: invoice.invoiceElectronic,
      subtotalWithoutTax: invoice.subtotalWithoutTax.toString(),
      subtotalWithTax: invoice.subtotalWithTax.toString(),
      total: invoice.total.toString(),
      startDate: invoice.startDate,
      endDate: invoice.endDate,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      deletedAt: invoice.deletedAt,
      invoiceType: {
        invoiceTypeId: invoice.invoiceType.invoiceTypeId,
        code: invoice.invoiceType.code,
        name: invoice.invoiceType.name,
      },
      payType: {
        payTypeId: invoice.payType.payTypeId,
        code: invoice.payType.code,
        name: invoice.payType.name,
      },
      paidType: {
        paidTypeId: invoice.paidType.paidTypeId,
        code: invoice.paidType.code,
        name: invoice.paidType.name,
      },
      user: {
        userId: invoice.user.userId,
        firstName: invoice.user.firstName,
        lastName: invoice.user.lastName,
        identificationNumber: invoice.user.identificationNumber,
      },
      employee: {
        userId: invoice.employee.userId,
        firstName: invoice.employee.firstName,
        lastName: invoice.employee.lastName,
        identificationNumber: invoice.employee.identificationNumber,
      },
      invoiceDetails: invoice.invoiceDetails.map((detail) => ({
        invoiceDetailId: detail.invoiceDetailId,
        amount: detail.amount,
        priceWithoutTax: detail.priceWithoutTax.toString(),
        priceWithTax: detail.priceWithTax.toString(),
        subtotal: detail.subtotal.toString(),
        startDate: detail.startDate,
        endDate: detail.endDate,
        taxeType: detail.taxeType
          ? {
              taxeTypeId: detail.taxeType.taxeTypeId,
              name: detail.taxeType.name,
              percentage: detail.taxeType.percentage,
            }
          : null,
        product: detail.product && {
          productId: detail.product.productId,
          name: detail.product.name,
          code: detail.product.code,
          categoryType: {
            categoryTypeId: detail.product.categoryType.categoryTypeId,
            name: detail.product.categoryType.name,
            code: detail.product.categoryType.code,
          },
        },
        accommodation: detail.accommodation && {
          accommodationId: detail.accommodation.accommodationId,
          name: detail.accommodation.name,
          code: detail.accommodation.code,
          categoryType: {
            categoryTypeId: detail.accommodation.categoryType.categoryTypeId,
            name: detail.accommodation.categoryType.name,
            code: detail.accommodation.categoryType.code,
          },
        },
        excursion: detail.excursion && {
          excursionId: detail.excursion.excursionId,
          name: detail.excursion.name,
          code: detail.excursion.code,
          categoryType: {
            categoryTypeId: detail.excursion.categoryType.categoryTypeId,
            name: detail.excursion.categoryType.name,
            code: detail.excursion.categoryType.code,
          },
        },
      })),
    };
  }

  async update(updateDto: UpdateInvoiceDto): Promise<GetInvoiceWithDetailsDto> {
    const { invoiceId, payTypeId, paidTypeId, invoiceElectronic } = updateDto;

    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { invoiceId },
        relations: ['payType', 'paidType'],
      });

      if (!invoice) throw new NotFoundException('Factura no encontrada');

      if (payTypeId !== undefined) {
        const payType = await queryRunner.manager.findOne(PayType, {
          where: { payTypeId },
        });
        if (!payType) throw new BadRequestException('Tipo de pago no válido');
        invoice.payType = payType;
      }

      if (paidTypeId !== undefined) {
        const paidType = await queryRunner.manager.findOne(PaidType, {
          where: { paidTypeId },
        });
        if (!paidType)
          throw new BadRequestException('Estado de pago no válido');
        invoice.paidType = paidType;
      }

      if (invoiceElectronic !== undefined) {
        invoice.invoiceElectronic = invoiceElectronic;
      }

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
}
