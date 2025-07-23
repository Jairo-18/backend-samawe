import { GeneralInvoiceDetaillService } from './../../shared/services/generalInvoiceDetaill.service';
import { Invoice } from './../../shared/entities/invoice.entity';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';
import { CreateInvoiceDetailDto } from './../dtos/invoiceDetaill.dto';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InvoiceDetaillMultiple {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _eventEmitter: EventEmitter2,
    private readonly _generalInvoiceDetaillService: GeneralInvoiceDetaillService,
  ) {}
  async createMultipleDetails(
    invoiceId: number,
    detailsDto: CreateInvoiceDetailDto[],
  ): Promise<InvoiceDetaill[]> {
    if (!detailsDto || detailsDto.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un detalle');
    }

    try {
      // Obtener la factura una sola vez
      const invoice = await this._invoiceRepository.findOne({
        where: { invoiceId },
        relations: ['invoiceType'],
      });

      if (!invoice) {
        throw new NotFoundException(
          `Factura con ID ${invoiceId} no encontrada`,
        );
      }

      // Procesar todos los detalles en una sola transacción
      const result = await this._invoiceRepository.manager.transaction(
        async (manager) => {
          const createdDetails: InvoiceDetaill[] = [];
          let hasProducts = false;
          let totalSubtotalWithoutTax = 0;
          let totalSubtotalWithTax = 0;
          let totalAmount = 0;

          // Procesar cada detalle
          for (const detailDto of detailsDto) {
            const detailResult = await this.createSingleDetailInTransaction(
              manager,
              invoice,
              detailDto,
            );

            createdDetails.push(detailResult.detail);

            if (detailResult.isProduct) {
              hasProducts = true;
            }

            // Acumular totales
            totalSubtotalWithoutTax +=
              Number(detailResult.detail.priceWithoutTax) *
              Number(detailResult.detail.amount);
            totalSubtotalWithTax +=
              Number(detailResult.detail.priceWithTax) *
              Number(detailResult.detail.amount);
            totalAmount += Number(detailResult.detail.subtotal);
          }

          // Actualizar totales de la factura
          await this.updateInvoiceTotalsInTransaction(
            manager,
            invoiceId,
            totalSubtotalWithoutTax,
            totalSubtotalWithTax,
            totalAmount,
          );

          return { createdDetails, hasProducts };
        },
      );

      // Emitir evento una sola vez al final
      this._eventEmitter.emit('invoice.details.bulk.created', {
        invoice,
        isProduct: result.hasProducts,
        detailsCount: result.createdDetails.length,
      });

      return result.createdDetails;
    } catch (error) {
      console.error('❌ Error interno creando detalles:', error); // 👈 AGREGA ESTO
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Ocurrió un error al crear los detalles',
      );
    }
  }

  // 4. MÉTODO PARA CREAR UN DETALLE INDIVIDUAL DENTRO DE TRANSACCIÓN
  private async createSingleDetailInTransaction(
    manager: any,
    invoice: Invoice,
    dto: CreateInvoiceDetailDto,
  ): Promise<{ detail: InvoiceDetaill; isProduct: boolean }> {
    // Validar taxeType si se proporciona
    const taxeType = dto.taxeTypeId
      ? await manager.getRepository('TaxeType').findOne({
          where: { taxeTypeId: dto.taxeTypeId },
        })
      : null;

    if (dto.taxeTypeId && !taxeType) {
      throw new NotFoundException('Tipo de impuesto no encontrado');
    }

    const taxRate = taxeType?.percentage
      ? taxeType.percentage > 1
        ? taxeType.percentage / 100
        : taxeType.percentage
      : 0;

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    // Validación de fechas
    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.startDate) >= new Date(dto.endDate)
    ) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    let priceBuy = 0;
    let priceWithoutTax = 0;
    let priceWithTax = 0;
    let subtotal = 0;
    let isProduct = false;
    let product = null;

    // Manejar productos
    if (dto.productId) {
      product = await manager.getRepository('Product').findOne({
        where: { productId: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (!product.isActive) {
        throw new BadRequestException('Este producto está inactivo');
      }

      const prices = this._generalInvoiceDetaillService.getHistoricalPrices(
        product,
        dto,
      );
      priceBuy = prices.priceBuy;
      priceWithoutTax = prices.priceWithoutTax;

      const validation =
        this._generalInvoiceDetaillService.validateProductPriceConsistency(
          product,
          priceBuy,
          priceWithoutTax,
          invoice.invoiceType.code,
        );

      if (!validation.isValid) {
        throw new BadRequestException(validation.message);
      }

      isProduct = true;
    } else {
      priceBuy = Number(dto.priceBuy) || 0;
      priceWithoutTax = Number(dto.priceWithoutTax) || 0;
    }

    if (isNaN(priceWithoutTax) || priceWithoutTax < 0) {
      throw new BadRequestException('El precio sin impuesto no es válido');
    }

    priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
    subtotal = Number((amount * priceWithTax).toFixed(2));

    // Crear el detalle
    const detailRepo = manager.getRepository('InvoiceDetaill');
    const detail = detailRepo.create({
      amount,
      priceBuy,
      priceWithoutTax,
      priceWithTax,
      subtotal,
      taxeType,
      invoice,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    if (product) {
      detail.product = product;
    }

    // Manejar accommodation y excursion
    const [accommodation, excursion] = await Promise.all([
      dto.accommodationId
        ? manager.getRepository('Accommodation').findOne({
            where: { accommodationId: dto.accommodationId },
            relations: ['stateType'],
          })
        : Promise.resolve(null),
      dto.excursionId
        ? manager.getRepository('Excursion').findOne({
            where: { excursionId: dto.excursionId },
          })
        : Promise.resolve(null),
    ]);

    if (dto.accommodationId && !accommodation) {
      throw new NotFoundException('Hospedaje no encontrado');
    }
    if (dto.excursionId && !excursion) {
      throw new NotFoundException('Excursión no encontrada');
    }

    if (accommodation) {
      // Validación del estado del accommodation
      if (!accommodation.stateType) {
        throw new BadRequestException(
          'El alojamiento no tiene un estado definido',
        );
      }

      const stateName = accommodation.stateType.name?.toString().trim();
      if (!stateName) {
        throw new BadRequestException('El nombre del estado no está definido');
      }

      if (stateName !== 'Disponible') {
        let stateMessage = '';
        switch (stateName) {
          case 'Mantenimiento':
            stateMessage = 'El hospedaje está en mantenimiento';
            break;
          case 'Ocupado':
            stateMessage = 'El hospedaje está ocupado';
            break;
          case 'Fuera de Servicio':
            stateMessage = 'El hospedaje está fuera de servicio';
            break;
          default:
            stateMessage = 'El hospedaje no está disponible';
        }
        throw new BadRequestException(stateMessage);
      }

      detail.accommodation = accommodation;

      // Cambiar estado a Ocupado
      const ocupadoState = await manager.getRepository('StateType').findOne({
        where: { name: 'Ocupado' },
      });

      if (!ocupadoState) {
        throw new NotFoundException('No se encontró el estado "Ocupado"');
      }

      accommodation.stateType = ocupadoState;
      await manager.getRepository('Accommodation').save(accommodation);
    }

    if (excursion) {
      detail.excursion = excursion;
    }

    // Guardar el detalle
    const savedDetail = await detailRepo.save(detail);

    // Actualizar stock del producto si es necesario
    if (isProduct && product) {
      const currentAmount = Number(product.amount) || 0;
      if (invoice.invoiceType.code === 'FV') {
        if (currentAmount < amount) {
          throw new BadRequestException(
            `No hay suficientes unidades para el producto ${product.name}`,
          );
        }
        product.amount = currentAmount - amount;
      } else if (invoice.invoiceType.code === 'FC') {
        product.amount = currentAmount + amount;
      }

      await manager.getRepository('Product').save(product);
    }

    return { detail: savedDetail, isProduct };
  }

  // 5. MÉTODO PARA ACTUALIZAR TOTALES DE FACTURA EN TRANSACCIÓN
  private async updateInvoiceTotalsInTransaction(
    manager: any,
    invoiceId: number,
    additionalSubtotalWithoutTax: number,
    additionalSubtotalWithTax: number,
    additionalTotal: number,
  ): Promise<void> {
    const invoiceRepo = manager.getRepository('Invoice');
    const invoice = await invoiceRepo.findOne({ where: { invoiceId } });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Sumar los nuevos totales a los existentes
    invoice.subtotalWithoutTax =
      Number(invoice.subtotalWithoutTax || 0) +
      Number(additionalSubtotalWithoutTax.toFixed(2));
    invoice.subtotalWithTax =
      Number(invoice.subtotalWithTax || 0) +
      Number(additionalSubtotalWithTax.toFixed(2));
    invoice.total =
      Number(invoice.total || 0) + Number(additionalTotal.toFixed(2));

    await invoiceRepo.save(invoice);
  }
}
