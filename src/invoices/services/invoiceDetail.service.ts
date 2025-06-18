import { Product } from './../../shared/entities/product.entity';
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
import { EventEmitter2 } from '@nestjs/event-emitter';

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
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateRelatedDataInvoiceDto> {
    const {
      invoiceType,
      taxeType,
      payType,
      paidType,
      categoryType,
      identificationType,
    } = this._repositoriesService.repositories;

    const [
      invoiceTypes,
      taxeTypes,
      payTypes,
      paidTypes,
      categoryTypes,
      identificationTypes,
    ] = await Promise.all([
      this._repositoriesService.getEntities<InvoiceType>(invoiceType),
      this._repositoriesService.getEntities<TaxeType>(taxeType),
      this._repositoriesService.getEntities<PayType>(payType),
      this._repositoriesService.getEntities<PaidType>(paidType),
      this._repositoriesService.getEntities<CategoryType>(categoryType),
      this._repositoriesService.getEntities<IdentificationType>(
        identificationType,
      ),
    ]);

    return {
      invoiceType: invoiceTypes,
      taxeType: taxeTypes,
      payType: payTypes,
      paidType: paidTypes,
      categoryType: categoryTypes,
      identificationType: identificationTypes,
    };
  }

  private async updateInvoiceTotal(invoiceId: number): Promise<void> {
    try {
      const details = await this._invoiceDetaillRepository.find({
        where: { invoice: { invoiceId } },
      });

      let subtotalWithoutTax = 0;
      let subtotalWithTax = 0;
      let total = 0;

      for (const detail of details) {
        const priceWithoutTax = Number(detail.priceWithoutTax) || 0;
        const priceWithTax = Number(detail.priceWithTax) || 0;
        const amount = Number(detail.amount) || 0;

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

  /**
   * Valida si los precios del producto han cambiado y sugiere crear uno nuevo
   */
  private validateProductPriceConsistency(
    product: Product,
    priceBuy: number,
    priceWithoutTax: number,
    invoiceTypeCode: string,
  ): { isValid: boolean; message?: string } {
    const currentPriceBuy = Number(product.priceBuy);
    const currentPriceSale = Number(product.priceSale);

    // Solo validar para facturas de compra
    if (invoiceTypeCode === 'FC') {
      const priceBuyDiff = Math.abs(currentPriceBuy - priceBuy) > 0.01;
      const priceSaleDiff = Math.abs(currentPriceSale - priceWithoutTax) > 0.01;

      if (priceBuyDiff || priceSaleDiff) {
        return {
          isValid: false,
          message: `⚠️ ATENCIÓN: Los precios del producto "${product.name}" han cambiado:
              Precios actuales del producto:
              - Precio de compra: $${currentPriceBuy}
              - Precio de venta: $${currentPriceSale}

              Precios en esta factura:
              - Precio de compra: $${priceBuy}
              - Precio de venta: $${priceWithoutTax}

              RECOMENDACIÓN: Considera crear un producto diferente para mantener la integridad contable, ya que esto podría alterar la contabilidad de la aplicación.`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Obtiene los precios históricos del producto o los precios actuales
   */
  private getHistoricalPrices(
    product: Product,
    dto: any,
  ): { priceBuy: number; priceWithoutTax: number } {
    // Si se proporcionan precios específicos en el DTO, usarlos (precios históricos)
    if (dto.priceBuy !== undefined && dto.priceWithoutTax !== undefined) {
      return {
        priceBuy: Number(dto.priceBuy),
        priceWithoutTax: Number(dto.priceWithoutTax),
      };
    }

    // Si no, usar los precios actuales del producto
    return {
      priceBuy: Number(product.priceBuy),
      priceWithoutTax: Number(product.priceSale),
    };
  }

  /**
   * Crea un nuevo detalle de factura con precios históricos
   */
  async create(invoiceId: number, dto: CreateInvoiceDetailDto) {
    try {
      const [invoice, taxeType] = await Promise.all([
        this._invoiceRepository.findOne({
          where: { invoiceId },
          relations: ['invoiceType'],
        }),
        dto.taxeTypeId
          ? this._taxeTypeRepository.findOne({
              where: { taxeTypeId: dto.taxeTypeId },
            })
          : Promise.resolve(null),
      ]);

      if (!invoice) {
        throw new NotFoundException(
          `Factura con ID ${invoiceId} no encontrada`,
        );
      }

      if (dto.taxeTypeId && !taxeType) {
        throw new NotFoundException('Tipo de impuesto no encontrado');
      }

      const taxRate =
        taxeType && taxeType.percentage
          ? taxeType.percentage > 1
            ? taxeType.percentage / 100
            : taxeType.percentage
          : 0;

      const amount = Number(dto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }

      let priceBuy = 0;
      let priceWithoutTax = 0;
      let priceWithTax = 0;
      let subtotal = 0;
      let isProduct = false;
      let product = null;

      if (dto.productId) {
        product = await this._productRepository.findOne({
          where: { productId: dto.productId },
        });
        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        const prices = this.getHistoricalPrices(product, dto);
        priceBuy = prices.priceBuy;
        priceWithoutTax = prices.priceWithoutTax;

        const validation = this.validateProductPriceConsistency(
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

      const detail = this._invoiceDetaillRepository.create({
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

      if (product) detail.product = product;

      const [accommodation, excursion] = await Promise.all([
        dto.accommodationId
          ? this._accommodationRepository.findOne({
              where: { accommodationId: dto.accommodationId },
            })
          : Promise.resolve(null),
        dto.excursionId
          ? this._excursionRepository.findOne({
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

      if (accommodation) detail.accommodation = accommodation;
      if (excursion) detail.excursion = excursion;

      const savedDetail = await this._invoiceDetaillRepository.save(detail);

      if (isProduct) {
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
      }

      await Promise.all([
        isProduct ? this._productRepository.save(product) : Promise.resolve(),
        this.updateInvoiceTotal(invoiceId),
      ]);

      this._eventEmitter.emit('invoice.detail.created', {
        invoice,
        isProduct,
      });

      return savedDetail;
    } catch (error) {
      return error;
    }
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

    const { invoice, product, amount: detailAmount } = detail;
    const invoiceTypeCode = invoice.invoiceType.code;
    const isSale = invoiceTypeCode === 'FV';
    const isBuy = invoiceTypeCode === 'FC';

    const ops: Promise<any>[] = [];

    // ✅ REVERTIR STOCK SI ES PRODUCTO
    if (product) {
      const currentAmount = Number(product.amount ?? 0);
      const amt = Number(detailAmount ?? 0);

      if (isNaN(currentAmount) || isNaN(amt)) {
        throw new Error(
          `Stock inválido: product.amount=${product.amount}, detail.amount=${detail.amount}`,
        );
      }

      if (isSale) {
        product.amount = currentAmount + amt;
      } else if (isBuy) {
        const newAmount = currentAmount - amt;
        if (newAmount < 0) {
          throw new BadRequestException(
            `No se puede eliminar: dejaría el stock del producto ${product.name} en negativo`,
          );
        }
        product.amount = newAmount;
      }

      ops.push(this._productRepository.save(product));
    }

    // ✅ ELIMINAR DETALLE Y ACTUALIZAR TOTAL EN PARALELO
    ops.push(
      this._invoiceDetaillRepository.remove(detail),
      this.updateInvoiceTotal(invoice.invoiceId),
    );

    await Promise.all(ops);

    this._eventEmitter.emit('invoice.detail.deleted', {
      invoice,
      isProduct: !!product,
    });

    return {
      invoiceId: invoice.invoiceId,
      deletedDetailId: invoiceDetailId,
    };
  }
}
