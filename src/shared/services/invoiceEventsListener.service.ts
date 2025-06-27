import { Injectable } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
import { BalanceService } from './balance.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class InvoiceEventsListener {
  constructor(private readonly _balanceService: BalanceService) {}
  private readonly processingMutex = new Map<number, Promise<void>>();
  private isUpdatingProducts = false;

  @OnEvent('invoice.deleted', { async: true })
  async handleInvoiceDeleted(payload: {
    invoice: Invoice;
    hasProducts: boolean;
  }) {
    try {
      await this._balanceService.removeInvoiceFromBalance(payload.invoice);
      if (payload.hasProducts) {
        await this._balanceService.updateBalanceWithCurrentProducts();
      }
    } catch (err) {
      console.error('Error updating balance after invoice deletion:', err);
    }
  }

  @OnEvent('invoice.detail.created')
  async handleInvoiceDetailCreated(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    const invoiceId = payload.invoice.invoiceId;

    // Evitar múltiples procesamiento del mismo invoice
    if (this.processingMutex.has(invoiceId)) {
      await this.processingMutex.get(invoiceId);
      return;
    }

    const processingPromise = this.processInvoiceDetail(payload);
    this.processingMutex.set(invoiceId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingMutex.delete(invoiceId);
    }
  }

  @OnEvent('invoice.detail.deleted')
  async handleInvoiceDetailDeleted(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    const invoiceId = payload.invoice.invoiceId;

    // Evitar múltiples procesamiento del mismo invoice
    if (this.processingMutex.has(invoiceId)) {
      await this.processingMutex.get(invoiceId);
      return;
    }

    const processingPromise = this.processInvoiceDetail(payload);
    this.processingMutex.set(invoiceId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingMutex.delete(invoiceId);
    }
  }

  private async processInvoiceDetail(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    await this._balanceService.updateBalanceByInvoiceId(
      payload.invoice.invoiceId,
    );

    if (payload.isProduct) {
      // Serializar la actualización de productos globales
      while (this.isUpdatingProducts) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.isUpdatingProducts = true;
      try {
        await this._balanceService.updateBalanceWithCurrentProducts();
      } finally {
        this.isUpdatingProducts = false;
      }
    }
  }
}
