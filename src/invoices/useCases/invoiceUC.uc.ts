import { CreateInvoiceDto } from '../dtos/invoice.dto';
import { InvoiceService } from './../services/invoice.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceUC {
  constructor(private readonly _invoiceService: InvoiceService) {}

  async create(invoiceId: CreateInvoiceDto) {
    return await this._invoiceService.create(invoiceId);
  }
}
