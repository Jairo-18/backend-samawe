import { Product } from './../entities/product.entity';
import { InvoiceRepository } from './../repositories/invoice.repository';
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
  ) {}
  async updateInvoiceTotal(invoiceId: number): Promise<void> {
    try {
      const row = await this._invoiceDetaillRepository
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.priceWithoutTax * d.amount), 0)', 'subtotalWithoutTax')
        .addSelect('COALESCE(SUM((d.priceWithTax - d.priceWithoutTax) * d.amount), 0)', 'subtotalWithTax')
        .addSelect('COALESCE(SUM(d.priceWithTax * d.amount), 0)', 'total')
        .addSelect('COALESCE(SUM(CASE WHEN d.taxeTypeId = 1 THEN d.totalVat ELSE 0 END), 0)', 'totalVat')
        .addSelect('COALESCE(SUM(CASE WHEN d.taxeTypeId = 3 THEN d.totalIco8 ELSE 0 END), 0)', 'totalIco8')
        .addSelect('COALESCE(SUM(CASE WHEN d.taxeTypeId = 4 THEN d.totalIco5 ELSE 0 END), 0)', 'totalIco5')
        .where('d.invoiceId = :invoiceId', { invoiceId })
        .getRawOne();

      const { subtotalWithoutTax, subtotalWithTax, total, totalVat, totalIco8, totalIco5 } = row;

      const updateResult = await this._invoiceRepository.update(invoiceId, {
        subtotalWithoutTax: Math.round(Number(subtotalWithoutTax) * 100) / 100,
        subtotalWithTax: Math.round(Number(subtotalWithTax) * 100) / 100,
        total: Math.round(Number(total) * 100) / 100,
        totalVat: Math.round(Number(totalVat) * 100) / 100,
        totalIco8: Math.round(Number(totalIco8) * 100) / 100,
        totalIco5: Math.round(Number(totalIco5) * 100) / 100,
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
   * Obtiene los precios del producto.
   * priceSale = precio de venta con impuesto incluido (all-in).
   */
  getHistoricalPrices(
    product: Product,
    dto: any,
  ): { priceBuy: number; priceSale: number } {
    if (dto.priceBuy !== undefined && dto.priceSale !== undefined) {
      return {
        priceBuy: Number(dto.priceBuy),
        priceSale: Number(dto.priceSale),
      };
    }

    return {
      priceBuy: Number(product.priceBuy),
      priceSale: Number(product.priceSale),
    };
  }

  /**
   * Descompone el precio all-in en base gravable e impuesto.
   * Fórmula: base = priceSale / (1 + taxRate), taxe = priceSale - base
   */
  decomposeTax(priceSale: number, taxRate: number): {
    priceWithoutTax: number;
    taxe: number;
    priceWithTax: number;
  } {
    const priceWithoutTax =
      taxRate > 0
        ? Math.round((priceSale / (1 + taxRate)) * 100) / 100
        : priceSale;
    const taxe = Math.round((priceSale - priceWithoutTax) * 100) / 100;
    return { priceWithoutTax, taxe, priceWithTax: priceSale };
  }

  /**
   * Calcula los campos de impuesto por tipo para un ítem de detalle.
   * taxeTypeId 1 = IVA 19%, 3 = ICO 8%, 4 = ICO 5%
   */
  computeTaxColumns(
    taxe: number,
    amount: number,
    taxeTypeId: number | null | undefined,
  ): { totalVat: number; totalIco8: number; totalIco5: number } {
    const taxTotal = Math.round(taxe * amount * 100) / 100;
    return {
      totalVat: taxeTypeId === 1 ? taxTotal : 0,
      totalIco8: taxeTypeId === 3 ? taxTotal : 0,
      totalIco5: taxeTypeId === 4 ? taxTotal : 0,
    };
  }
}
