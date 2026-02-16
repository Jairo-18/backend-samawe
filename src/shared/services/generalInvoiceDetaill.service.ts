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
      // ✅ Calcular totales directamente en la DB
      const { subtotalWithoutTax, subtotalWithTax, total } =
        await this._invoiceDetaillRepository
          .createQueryBuilder('d')
          .select(
            'COALESCE(SUM(d.priceWithoutTax * d.amount), 0)',
            'subtotalWithoutTax',
          )
          .addSelect(
            'COALESCE(SUM((d.priceWithTax - d.priceWithoutTax) * d.amount), 0)',
            'subtotalWithTax',
          )
          .addSelect('COALESCE(SUM(d.priceWithTax * d.amount), 0)', 'total')
          .where('d.invoiceId = :invoiceId', { invoiceId })
          .getRawOne();

      // ✅ Actualizar factura
      const updateResult = await this._invoiceRepository.update(invoiceId, {
        subtotalWithoutTax: Math.round(Number(subtotalWithoutTax) * 100) / 100,
        subtotalWithTax: Math.round(Number(subtotalWithTax) * 100) / 100,
        total: Math.round(Number(total) * 100) / 100,
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
