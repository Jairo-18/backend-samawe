import { User } from './../../shared/entities/user.entity';
import { PaidType } from './../../shared/entities/paidType.entity';
import { PayType } from './../../shared/entities/payType.entity';
import { PaidTypeRepository } from './../../shared/repositories/paidType.repository';
import { PayTypeRepository } from './../../shared/repositories/payType.repository';
import { UserRepository } from './../../shared/repositories/user.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateInvoiceWithDetailsDto,
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';
import { InvoiceTypeRepository } from './../../shared/repositories/invoiceType.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

    // Validar payType
    const payType = await this._payTypeRepository.findOne({
      where: { payTypeId },
    });
    if (!payType) {
      throw new BadRequestException('Tipo de pago no encontrado');
    }

    // Validar paidType
    const paidType = await this._paidTypeRepository.findOne({
      where: { paidTypeId },
    });
    if (!paidType) {
      throw new BadRequestException('Estado de pago no encontrado');
    }

    // Validar tipo de factura
    const invoiceType = await this._invoiceTypeRepository.findOne({
      where: { invoiceTypeId },
    });
    if (!invoiceType) {
      throw new BadRequestException('Tipo de factura no encontrado');
    }

    // Validar cliente
    const user = await this._userRepository.findOne({
      where: { userId },
    });
    if (!user) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // Validar que no exista otra factura con el mismo code y tipo
    const existingInvoice = await this._invoiceRepository.findOne({
      where: {
        code,
        invoiceType: { invoiceTypeId },
      },
      relations: ['invoiceType'],
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Ya existe una factura con código '${code}' para el mismo tipo de factura.`,
      );
    }

    // Preparar detalles
    let invoiceTotal = 0;
    const invoiceDetails = [];

    for (const detail of details) {
      let taxRate = 0;
      let taxeType = null;

      if (detail.taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: detail.taxeTypeId },
          select: ['taxeTypeId', 'percentage'], // Asegurarnos de traer el rate
        });
        if (!taxeType) {
          throw new BadRequestException('Tipo de impuesto no encontrado');
        }
        taxRate = taxeType.rate / 100; // Convertir porcentaje a decimal (ej: 16% -> 0.16)
      }

      // Validar que los valores numéricos sean válidos
      const priceWithoutTax = Number(detail.priceWithoutTax);
      const amount = Number(detail.amount);

      if (isNaN(priceWithoutTax) || isNaN(amount)) {
        throw new BadRequestException('Los valores numéricos no son válidos');
      }

      // Calcular valores
      const priceWithTax = priceWithoutTax * (1 + taxRate);
      const subtotal = amount * priceWithTax;
      invoiceTotal += subtotal;

      invoiceDetails.push({
        amount: amount,
        priceWithoutTax: priceWithoutTax,
        priceWithTax: priceWithTax,
        subtotal: subtotal,
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

    // Crear la factura con detalles, cliente y empleado
    const newInvoice = this._invoiceRepository.create({
      code,
      ...invoiceData,
      subtotal: invoiceTotal, // Asegurar que subtotal también se establezca
      total: invoiceTotal,
      invoiceType,
      user,
      employee: { userId: employeeId },
      payType,
      paidType,
      invoiceDetails,
    });

    return await this._invoiceRepository.save(newInvoice);
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
      subtotal: invoice.subtotal.toString(),
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
          categoryType: {
            categoryTypeId: detail.product.categoryType.categoryTypeId,
            name: detail.product.categoryType.name,
            code: detail.product.categoryType.code,
          },
        },

        accommodation: detail.accommodation && {
          accommodationId: detail.accommodation.accommodationId,
          name: detail.accommodation.name,
          categoryType: {
            categoryTypeId: detail.accommodation.categoryType.categoryTypeId,
            name: detail.accommodation.categoryType.name,
            code: detail.accommodation.categoryType.code,
          },
        },

        excursion: detail.excursion && {
          excursionId: detail.excursion.excursionId,
          name: detail.excursion.name,
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

      // Actualizar payType si se envía
      if (payTypeId !== undefined) {
        const payType = await queryRunner.manager.findOne(PayType, {
          where: { payTypeId },
        });
        if (!payType) throw new BadRequestException('Tipo de pago no válido');
        invoice.payType = payType;
      }

      // Actualizar paidType si se envía
      if (paidTypeId !== undefined) {
        const paidType = await queryRunner.manager.findOne(PaidType, {
          where: { paidTypeId },
        });
        if (!paidType)
          throw new BadRequestException('Estado de pago no válido');
        invoice.paidType = paidType;
      }

      // Actualizar cliente (user UUID) si se envía
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

    // Primero elimina los detalles asociados
    await this._invoiceDetailRepository.delete({ invoice: { invoiceId } });

    // Luego elimina la factura
    return await this._invoiceRepository.delete(invoiceId);
  }
}
