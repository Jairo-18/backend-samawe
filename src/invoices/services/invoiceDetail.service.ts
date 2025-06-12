import { BalanceRepository } from './../../shared/repositories/balance.repository';
import { BalanceService } from './../../shared/services/balance.service';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { IdentificationType } from './../../shared/entities/identificationType.entity';
import { PaidType } from './../../shared/entities/paidType.entity';
import { PayType } from './../../shared/entities/payType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';

import {
  CreateInvoiceDetailDto,
  CreateRelatedDataInvoiceDto,
} from '../dtos/invoiceDetaill.dto';

@Injectable()
export class InvoiceDetailService {
  constructor(
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _repositoriesService: RepositoryService,
    private readonly _balanceService: BalanceService,
    private readonly _balanceRepository: BalanceRepository,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateRelatedDataInvoiceDto> {
    const invoiceType =
      await this._repositoriesService.getEntities<InvoiceType>(
        this._repositoriesService.repositories.invoiceType,
      );

    const taxeType = await this._repositoriesService.getEntities<TaxeType>(
      this._repositoriesService.repositories.taxeType,
    );

    const payType = await this._repositoriesService.getEntities<PayType>(
      this._repositoriesService.repositories.payType,
    );

    const paidType = await this._repositoriesService.getEntities<PaidType>(
      this._repositoriesService.repositories.paidType,
    );

    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const identificationType =
      await this._repositoriesService.getEntities<IdentificationType>(
        this._repositoriesService.repositories.identificationType,
      );

    return {
      invoiceType,
      taxeType,
      payType,
      paidType,
      identificationType,
      categoryType,
    };
  }

  // 🔥 Método mejorado para actualizar totales de la factura
  private async updateInvoiceTotal(invoiceId: number): Promise<void> {
    try {
      // Obtener todos los detalles de la factura
      const details = await this._invoiceDetaillRepository.find({
        where: { invoice: { invoiceId } },
      });

      let subtotalWithoutTax = 0;
      let subtotalWithTax = 0;
      let total = 0;

      // Calcular totales basándose en los detalles existentes
      for (const detail of details) {
        const priceWithoutTax = Number(detail.priceWithoutTax) || 0;
        const priceWithTax = Number(detail.priceWithTax) || 0;
        const amount = Number(detail.amount) || 0;

        // Validación adicional
        if (priceWithoutTax < 0 || priceWithTax < 0 || amount < 0) {
          continue;
        }

        const lineSubtotalWithoutTax = priceWithoutTax * amount;
        const lineSubtotalWithTax = priceWithTax * amount;
        const taxAmount = lineSubtotalWithTax - lineSubtotalWithoutTax;

        subtotalWithoutTax += lineSubtotalWithoutTax;
        subtotalWithTax += taxAmount;
        total += lineSubtotalWithTax;
      }

      // Redondear para evitar problemas de precisión decimal
      subtotalWithoutTax = Math.round(subtotalWithoutTax * 100) / 100;
      subtotalWithTax = Math.round(subtotalWithTax * 100) / 100;
      total = Math.round(total * 100) / 100;

      // Actualizar la factura
      const updateResult = await this._invoiceRepository.update(invoiceId, {
        subtotalWithoutTax,
        subtotalWithTax,
        total,
      });

      if (updateResult.affected === 0) {
        throw new NotFoundException(
          `No se pudo actualizar la factura con ID ${invoiceId}`,
        );
      }
    } catch (error) {
      console.error(
        `Error actualizando totales de factura ${invoiceId}:`,
        error,
      );
      throw new BadRequestException(
        `Error actualizando totales de la factura: ${error.message}`,
      );
    }
  }

  async create(invoiceId: number, dto: CreateInvoiceDetailDto) {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['invoiceType'],
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    let taxRate = 0;
    let taxeType = null;

    if (dto.taxeTypeId) {
      taxeType = await this._taxeTypeRepository.findOne({
        where: { taxeTypeId: dto.taxeTypeId },
      });
      if (!taxeType) {
        throw new NotFoundException('Tipo de impuesto no encontrado');
      }
      taxRate =
        taxeType.percentage > 1
          ? taxeType.percentage / 100
          : taxeType.percentage;
    }

    const priceWithoutTax = Number(dto.priceWithoutTax);
    const amount = Number(dto.amount);

    if (
      isNaN(priceWithoutTax) ||
      isNaN(amount) ||
      priceWithoutTax < 0 ||
      amount <= 0
    ) {
      throw new BadRequestException(
        'Los valores numéricos no son válidos o deben ser mayores a cero',
      );
    }

    const priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
    const subtotal = Number((amount * priceWithTax).toFixed(2));

    const detail = this._invoiceDetaillRepository.create({
      amount,
      priceWithoutTax,
      priceWithTax,
      subtotal,
      taxeType,
      invoice,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    // Relaciones
    let isProduct = false;
    let product = null;

    if (dto.productId) {
      product = await this._productRepository.findOne({
        where: { productId: dto.productId },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      detail.product = product;
      isProduct = true;
    }

    if (dto.accommodationId) {
      const accommodation = await this._accommodationRepository.findOne({
        where: { accommodationId: dto.accommodationId },
      });
      if (!accommodation)
        throw new NotFoundException('Hospedaje no encontrado');
      detail.accommodation = accommodation;
    }

    if (dto.excursionId) {
      const excursion = await this._excursionRepository.findOne({
        where: { excursionId: dto.excursionId },
      });
      if (!excursion) throw new NotFoundException('Excursión no encontrada');
      detail.excursion = excursion;
    }

    const savedDetail = await this._invoiceDetaillRepository.save(detail);

    // ✅ MANEJO DE STOCK DE PRODUCTO
    if (isProduct) {
      const currentAmount = Number(product.amount) || 0;

      if (invoice.invoiceType.code === 'FV') {
        if (currentAmount < amount) {
          throw new BadRequestException(
            `No hay suficiente stock para el producto ${product.name}`,
          );
        }
        product.amount = currentAmount - amount;
      } else if (invoice.invoiceType.code === 'FC') {
        product.amount = currentAmount + amount;
      }

      await this._productRepository.save(product);
    }

    // ✅ ACTUALIZAR TOTAL DE LA FACTURA
    await this.updateInvoiceTotal(invoiceId);

    // ✅ ACTUALIZAR BALANCE (SOLO UNA VEZ)
    // Primero actualizamos el balance de facturas
    await this._balanceService.updateBalanceWithInvoice(invoice);

    // Luego actualizamos el balance de productos (si hay productos involucrados)
    if (isProduct) {
      await this._balanceService.updateBalanceWithCurrentProducts();
    }

    return savedDetail;
  }

  async delete(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: ['invoice', 'product', 'invoice.invoiceType'],
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    const invoice = detail.invoice;
    const isSale = invoice.invoiceType.code === 'FV';
    const isBuy = invoice.invoiceType.code === 'FC';

    // ✅ REVERTIR STOCK SI ES PRODUCTO
    if (detail.product) {
      const product = detail.product;
      const currentAmount = Number(product.amount ?? 0);
      const detailAmount = Number(detail.amount ?? 0);

      if (isNaN(currentAmount) || isNaN(detailAmount)) {
        throw new Error(
          `Stock inválido: product.amount=${product.amount}, detail.amount=${detail.amount}`,
        );
      }

      if (isSale) {
        // Si fue venta, se había restado => ahora se suma
        product.amount = currentAmount + detailAmount;
      } else if (isBuy) {
        // Si fue compra, se había sumado => ahora se resta
        const newAmount = currentAmount - detailAmount;
        if (newAmount < 0) {
          throw new BadRequestException(
            `No se puede eliminar: dejaría el stock del producto ${product.name} en negativo`,
          );
        }
        product.amount = newAmount;
      }

      await this._productRepository.save(product);
    }

    // ✅ ELIMINAR EL DETALLE
    await this._invoiceDetaillRepository.remove(detail);

    // ✅ RECALCULAR TOTAL DE LA FACTURA
    await this.updateInvoiceTotal(invoice.invoiceId);

    // ✅ ACTUALIZAR BALANCE (MÉTODO SIMPLIFICADO)
    // Recalculamos los balances de facturas para todos los períodos
    await this._balanceService.updateBalanceWithInvoice(invoice);

    // Si había producto involucrado, actualizamos balance de productos
    if (detail.product) {
      await this._balanceService.updateBalanceWithCurrentProducts();
    }

    return {
      invoiceId: invoice.invoiceId,
      deletedDetailId: invoiceDetailId,
    };
  }
}
