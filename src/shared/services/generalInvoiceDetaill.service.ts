import { Product } from './../entities/product.entity';
import { InvoiceRepository } from './../repositories/invoice.repository';
import { AccommodationRepository } from './../repositories/accommodation.repository';
import { InvoiceDetaillRepository } from './../repositories/invoiceDetaill.repository';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GeneralInvoiceDetaillService {
  constructor(
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}
  async updateInvoiceTotal(invoiceId: number): Promise<void> {
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
  validateProductPriceConsistency(
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
  getHistoricalPrices(
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
}
