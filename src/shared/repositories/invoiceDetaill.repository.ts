import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InvoiceDetaill } from '../entities/invoiceDetaill.entity';

@Injectable()
export class InvoiceDetaillRepository extends Repository<InvoiceDetaill> {
  constructor(dataSource: DataSource) {
    super(InvoiceDetaill, dataSource.createEntityManager());
  }
}
