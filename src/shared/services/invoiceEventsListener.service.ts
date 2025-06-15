import { Injectable } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
import { BalanceService } from './balance.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class InvoiceEventsListener {
  constructor(private readonly _balanceService: BalanceService) {}

  @OnEvent('invoice.created', { async: true })
  async handleInvoiceCreated(payload: {
    invoice: Invoice;
    hasProducts: boolean;
  }) {
    try {
      await this._balanceService.updateBalanceWithInvoice(payload.invoice);
      if (payload.hasProducts) {
        await this._balanceService.updateBalanceWithCurrentProducts();
      }
    } catch (err) {
      console.error('Error updating balance after invoice creation:', err);
    }
  }

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
    await this._balanceService.updateBalanceWithInvoice(payload.invoice);
    if (payload.isProduct) {
      await this._balanceService.updateBalanceWithCurrentProducts();
    }
  }

  @OnEvent('invoice.detail.deleted')
  async handleInvoiceDetailDeleted(payload: {
    invoice: Invoice;
    isProduct: boolean;
  }) {
    await this._balanceService.updateBalanceWithInvoice(payload.invoice);
    if (payload.isProduct) {
      await this._balanceService.updateBalanceWithCurrentProducts();
    }
  }
}
