import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InvoiceDetail } from '../entities/invoiceDetaill.entity';

@Injectable()
export class InvoiceDetaillRepository extends Repository<InvoiceDetail> {
  constructor(dataSource: DataSource) {
    super(InvoiceDetail, dataSource.createEntityManager());
  }
}
