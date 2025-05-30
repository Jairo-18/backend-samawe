import { Injectable } from '@nestjs/common';
import { InvoiceService } from './../services/invoice.service';
import { InvoiceDetailService } from '../services/invoiceDetail.service';
import {
  CreateInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';
import {
  CreateInvoiceDetailDto,
  UpdateInvoiceDetailDto,
} from '../dtos/invoiceDetaill.dto';

@Injectable()
export class InvoiceUC {
  constructor(
    private readonly _invoiceService: InvoiceService,
    private readonly _invoiceDetailService: InvoiceDetailService,
  ) {}

  async createWithDetails(
    createInvoiceWithDetailsDto: CreateInvoiceWithDetailsDto,
  ) {
    return this._invoiceService.createWithDetails(createInvoiceWithDetailsDto);
  }

  async findOne(invoiceId: number) {
    return this._invoiceService.findOne(invoiceId);
  }

  async update(updateInvoiceDto: UpdateInvoiceDto) {
    return this._invoiceService.update(updateInvoiceDto);
  }

  async delete(invoiceId: number) {
    return this._invoiceService.delete(invoiceId);
  }

  // Aquí delegamos todo al servicio de detalles
  async addDetail(invoiceId: number, dto: CreateInvoiceDetailDto) {
    return this._invoiceDetailService.create(invoiceId, dto);
  }

  async updateDetail(
    invoiceDetailId: number,
    updateDto: UpdateInvoiceDetailDto,
  ) {
    return this._invoiceDetailService.update(invoiceDetailId, updateDto);
  }

  async deleteDetail(invoiceDetailId: number) {
    return this._invoiceDetailService.delete(invoiceDetailId);
  }

  async getRelatedDataToCreate() {
    return await this._invoiceDetailService.getRelatedDataToCreate();
  }
}
