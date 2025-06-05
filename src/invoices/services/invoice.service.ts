import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Invoice } from './../../shared/entities/invoice.entity';
import { User } from './../../shared/entities/user.entity';
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
  CreateInvoiceWithDetailsDto,
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';

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
  ) {}

  async createWithDetails(
    createInvoiceWithDetailsDto: CreateInvoiceWithDetailsDto,
    employeeId: string,
  ): Promise<Invoice> {
    const {
      invoiceTypeId,
      details,
      code,
      userId,
      payTypeId,
      paidTypeId,
      ...invoiceData
    } = createInvoiceWithDetailsDto;

    // Validaciones: obtener entidades relacionadas
    const [payType, paidType, invoiceType, user] = await Promise.all([
      this._payTypeRepository.findOne({ where: { payTypeId } }),
      this._paidTypeRepository.findOne({ where: { paidTypeId } }),
      this._invoiceTypeRepository.findOne({ where: { invoiceTypeId } }),
      this._userRepository.findOne({ where: { userId } }),
    ]);

    if (!payType) throw new BadRequestException('Tipo de pago no encontrado');
    if (!paidType)
      throw new BadRequestException('Estado de pago no encontrado');
    if (!invoiceType)
      throw new BadRequestException('Tipo de factura no encontrado');
    if (!user) throw new BadRequestException('Cliente no encontrado');

    // Verificar que no exista factura con mismo código y tipo
    const existingInvoice = await this._invoiceRepository.findOne({
      where: { code, invoiceType: { invoiceTypeId } },
      relations: ['invoiceType'],
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Ya existe una factura con código '${code}' para el mismo tipo de factura.`,
      );
    }

    // Calcular detalles y totales
    const {
      details: invoiceDetails,
      total,
      subtotalWithoutTax,
      subtotalWithTax,
    } = await this._calculateInvoiceDetails(details);

    // Crear entidad factura
    const newInvoice = this._invoiceRepository.create({
      code,
      ...invoiceData,
      subtotalWithoutTax,
      subtotalWithTax,
      total,
      invoiceType,
      user,
      employee: { userId: employeeId },
      payType,
      paidType,
      invoiceDetails,
    });

    return await this._invoiceRepository.save(newInvoice);
  }

  private async _calculateInvoiceDetails(
    details: CreateInvoiceWithDetailsDto['details'],
  ) {
    let invoiceTotal = 0;
    let subtotalWithoutTax = 0;
    let subtotalWithTax = 0;
    const invoiceDetails = [];

    for (const detail of details) {
      let taxRate = 0;
      let taxeType = null;

      if (detail.taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: detail.taxeTypeId },
          select: ['taxeTypeId', 'percentage', 'name'],
        });
        if (!taxeType) {
          throw new BadRequestException('Tipo de impuesto no encontrado');
        }
        taxRate = taxeType.percentage / 100;
      }

      const priceWithoutTax = Number(detail.priceWithoutTax);
      const amount = Number(detail.amount);

      if (isNaN(priceWithoutTax) || isNaN(amount)) {
        throw new BadRequestException('Los valores numéricos no son válidos');
      }

      const priceWithTax = priceWithoutTax * (1 + taxRate);
      const subtotal = amount * priceWithTax;

      subtotalWithoutTax += amount * priceWithoutTax;
      subtotalWithTax += subtotal;
      invoiceTotal += subtotal;

      invoiceDetails.push({
        amount,
        priceWithoutTax,
        priceWithTax,
        subtotal,
        taxeType,
        product: detail.productId ? { productId: detail.productId } : null,
        accommodation: detail.accommodationId
          ? { accommodationId: detail.accommodationId }
          : null,
        excursion: detail.excursionId
          ? { excursionId: detail.excursionId }
          : null,
      });
    }

    return {
      details: invoiceDetails,
      total: invoiceTotal,
      subtotalWithoutTax,
      subtotalWithTax,
    };
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
    const { invoiceId, payTypeId, paidTypeId, userId } = updateDto;

    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { invoiceId },
        relations: ['payType', 'paidType', 'user'],
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

      if (userId !== undefined) {
        const user = await queryRunner.manager.findOne(User, {
          where: { userId },
        });
        if (!user) throw new BadRequestException('Cliente no encontrado');
        invoice.user = user;
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

  async delete(invoiceId: number) {
    await this.findOne(invoiceId);

    // Borrado físico de detalles relacionados
    await this._invoiceDetailRepository.delete({ invoice: { invoiceId } });

    // Soft delete de la factura
    return await this._invoiceRepository.softDelete(invoiceId);
  }
}
