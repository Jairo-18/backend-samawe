import { Injectable } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
import { BalanceService } from './balance.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class InvoiceEventsListener {
  constructor(private readonly _balanceService: BalanceService) {}

  private readonly processingMutex = new Map<number, Promise<void>>();
  private productsUpdatePromise: Promise<void> | null = null;

  @OnEvent('invoice.deleted', { async: true })
  async handleInvoiceDeleted(payload: {
    invoice: Invoice;
    hasProducts: boolean;
  }) {
    try {
      await this._balanceService.removeInvoiceFromBalance(payload.invoice);
      if (payload.hasProducts) {
        await this.updateProductsBalance();
      }
    } catch (err) {
      console.error('Error updating balance after invoice deletion:', err);
      throw err; // Re-lanzar para que el event emitter maneje el error
    }
  }

  @OnEvent('invoice.detail.created')
  async handleInvoiceDetailCreated(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    await this.processInvoiceDetailEvent(payload);
  }

  @OnEvent('invoice.detail.deleted')
  async handleInvoiceDetailDeleted(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    await this.processInvoiceDetailEvent(payload);
  }

  private async processInvoiceDetailEvent(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    const invoiceId = payload.invoice.invoiceId;

    try {
      // Procesar el evento con mutex para evitar procesamiento duplicado
      const processingPromise =
        this.processingMutex.get(invoiceId) ||
        this.processInvoiceDetail(payload);

      this.processingMutex.set(invoiceId, processingPromise);
      await processingPromise;
    } catch (err) {
      console.error(
        `Error processing invoice detail event for invoice ${invoiceId}:`,
        err,
      );
      throw err;
    } finally {
      this.processingMutex.delete(invoiceId);
    }
  }

  private async processInvoiceDetail(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    // Actualizar balance específico del invoice
    await this._balanceService.updateBalanceByInvoiceId(
      payload.invoice.invoiceId,
    );

    // Si es un producto, actualizar balance global de productos
    if (payload.isProduct) {
      await this.updateProductsBalance();
    }
  }

  private async updateProductsBalance(): Promise<void> {
    // Si ya hay una actualización en progreso, esperar a que termine
    if (this.productsUpdatePromise) {
      await this.productsUpdatePromise;
      return;
    }

    // Crear nueva promesa de actualización
    this.productsUpdatePromise = this._balanceService
      .updateBalanceWithCurrentProducts()
      .catch((err) => {
        console.error('Error updating products balance:', err);
        throw err;
      })
      .finally(() => {
        this.productsUpdatePromise = null;
      });

    await this.productsUpdatePromise;
  }

  @OnEvent('invoice.details.bulk.created')
  async handleInvoiceDetailsBulkCreated(payload: {
    invoice: Invoice;
    isProduct: boolean;
    detailsCount: number;
  }) {
    await this.processInvoiceDetailEvent({
      invoice: payload.invoice,
      isProduct: payload.isProduct,
    });
  }
}
