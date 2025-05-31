import { PaidType } from './../../shared/entities/paidType.entity';
import { PayType } from './../../shared/entities/payType.entity';
import { PaidTypeRepository } from './../../shared/repositories/paidType.repository';
import { PayTypeRepository } from './../../shared/repositories/payType.repository';
import { UserRepository } from './../../shared/repositories/user.repository';
import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { Excursion } from './../../shared/entities/excursion.entity';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { Product } from './../../shared/entities/product.entity';
import { InvoiceDetail } from './../../shared/entities/invoiceDetaill.entity';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateInvoiceWithDetailsDto,
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

  async findOne(invoiceId: number): Promise<Invoice> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'invoiceType',
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

    return invoice;
  }

  async update(updateDto: UpdateInvoiceDto): Promise<Invoice> {
    const {
      invoiceId,
      invoiceTypeId,
      code,
      startDate,
      endDate,
      details,
      payTypeId,
      paidTypeId,
    } = updateDto;

    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cargar factura con detalles
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { invoiceId },
        relations: ['invoiceDetails', 'payType', 'paidType'],
      });

      if (!invoice) throw new NotFoundException('Factura no encontrada');

      // Validar invoiceType
      const invoiceType = await queryRunner.manager.findOne(InvoiceType, {
        where: { invoiceTypeId },
      });
      if (!invoiceType)
        throw new BadRequestException('Tipo de factura no válido');

      // Actualizar payType si viene en el DTO
      if (payTypeId !== undefined) {
        const payType = await queryRunner.manager.findOne(PayType, {
          where: { payTypeId },
        });
        if (!payType) throw new BadRequestException('Tipo de pago no válido');
        invoice.payType = payType;
      }

      // Actualizar paidType si viene en el DTO
      if (paidTypeId !== undefined) {
        const paidType = await queryRunner.manager.findOne(PaidType, {
          where: { paidTypeId },
        });
        if (!paidType)
          throw new BadRequestException('Estado de pago no válido');
        invoice.paidType = paidType;
      }
      // Actualizar campos factura
      invoice.code = code;
      invoice.startDate = new Date(startDate);
      invoice.endDate = new Date(endDate);
      invoice.invoiceType = invoiceType;

      // Guardar factura (sin detalles aún)
      await queryRunner.manager.save(invoice);

      // Mapa detalles existentes para fácil acceso
      const existingDetailsMap = new Map(
        invoice.invoiceDetails.map((d) => [d.invoiceDetailId, d]),
      );

      let invoiceTotal = 0;
      const detailsToSave: InvoiceDetail[] = [];
      const keepDetailIds = new Set<number>();

      for (const d of details) {
        let detailEntity: InvoiceDetail;

        if (d.invoiceDetailId) {
          detailEntity = existingDetailsMap.get(d.invoiceDetailId);
          if (!detailEntity) {
            throw new NotFoundException(
              `Detalle con id ${d.invoiceDetailId} no encontrado`,
            );
          }
          keepDetailIds.add(d.invoiceDetailId);
        } else {
          detailEntity = new InvoiceDetail();
          detailEntity.invoice = invoice;
        }

        // Asociar entidad relacionada
        if (d.productId) {
          const product = await queryRunner.manager.findOne(Product, {
            where: { productId: d.productId },
          });
          if (!product)
            throw new BadRequestException(`Producto ${d.productId} no existe`);
          detailEntity.product = product;
          detailEntity.accommodation = null;
          detailEntity.excursion = null;
        } else if (d.accommodationId) {
          const accommodation = await queryRunner.manager.findOne(
            Accommodation,
            { where: { accommodationId: d.accommodationId } },
          );
          if (!accommodation)
            throw new BadRequestException(
              `Hospedaje ${d.accommodationId} no existe`,
            );
          detailEntity.accommodation = accommodation;
          detailEntity.product = null;
          detailEntity.excursion = null;
        } else if (d.excursionId) {
          const excursion = await queryRunner.manager.findOne(Excursion, {
            where: { excursionId: d.excursionId },
          });
          if (!excursion)
            throw new BadRequestException(
              `Excursión ${d.excursionId} no existe`,
            );
          detailEntity.excursion = excursion;
          detailEntity.product = null;
          detailEntity.accommodation = null;
        } else {
          throw new BadRequestException(
            'Debe asignar productId, accommodationId o excursionId en detalle',
          );
        }

        // TaxeType opcional
        let taxRate = 0;
        if (d.taxeTypeId) {
          const taxeType = await queryRunner.manager.findOne(TaxeType, {
            where: { taxeTypeId: d.taxeTypeId },
          });
          if (!taxeType)
            throw new BadRequestException(`TaxeType ${d.taxeTypeId} no existe`);
          detailEntity.taxeType = taxeType;
          taxRate = taxeType.percentage;
        } else {
          detailEntity.taxeType = null;
        }

        // Calcular valores
        const priceWithTax = d.priceWithoutTax * (1 + taxRate);
        const subtotal = d.amount * priceWithTax;
        invoiceTotal += subtotal;

        // Asignar valores
        detailEntity.amount = d.amount;
        detailEntity.priceWithoutTax = d.priceWithoutTax;
        detailEntity.priceWithTax = priceWithTax;
        detailEntity.subtotal = subtotal;

        detailsToSave.push(detailEntity);
      }

      // Actualizar total de la factura
      invoice.total = invoiceTotal;

      // Guardar detalles (nuevos y editados)
      await queryRunner.manager.save(InvoiceDetail, detailsToSave);

      // Eliminar detalles que ya no están en el arreglo enviado
      const toDelete = invoice.invoiceDetails.filter(
        (d) => !keepDetailIds.has(d.invoiceDetailId),
      );

      if (toDelete.length > 0) {
        await queryRunner.manager.remove(InvoiceDetail, toDelete);
      }

      await queryRunner.commitTransaction();

      // Retornar la factura actualizada con detalles
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
