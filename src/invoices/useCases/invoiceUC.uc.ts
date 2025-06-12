import { InvoicedPaginatedService } from './../services/invoicePaginated.service';
import { PaginatedListExcursionsParamsDto } from './../../excursions/dtos/crudExcursion.dto';
import { Injectable } from '@nestjs/common';
import { InvoiceService } from './../services/invoice.service';
import { InvoiceDetailService } from '../services/invoiceDetail.service';
import {
  CreateInvoiceDto,
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';
import { CreateInvoiceDetailDto } from '../dtos/invoiceDetaill.dto';

@Injectable()
export class InvoiceUC {
  constructor(
    private readonly _invoiceService: InvoiceService,
    private readonly _invoiceDetailService: InvoiceDetailService,
    private readonly _invoicedPaginatedService: InvoicedPaginatedService,
  ) {}

  async createInvoice(createInvoiceDto: CreateInvoiceDto, employeeId: string) {
    return this._invoiceService.create(createInvoiceDto, employeeId);
  }

  async findOne(invoiceId: number): Promise<GetInvoiceWithDetailsDto> {
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

  async deleteDetail(invoiceDetailId: number) {
    return this._invoiceDetailService.delete(invoiceDetailId);
  }

  async getRelatedDataToCreate() {
    return await this._invoiceDetailService.getRelatedDataToCreate();
  }

  async paginatedList(params: PaginatedListExcursionsParamsDto) {
    return await this._invoicedPaginatedService.paginatedList(params);
  }
}
