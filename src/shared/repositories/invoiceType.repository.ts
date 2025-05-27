import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InvoiceType } from '../entities/invoiceType.entity';

@Injectable()
export class InvoiceTypeRepository extends Repository<InvoiceType> {
  constructor(dataSource: DataSource) {
    super(InvoiceType, dataSource.createEntityManager());
  }
}
