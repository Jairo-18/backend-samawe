import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreditNote } from '../entities/creditNote.entity';

@Injectable()
export class CreditNoteRepository extends Repository<CreditNote> {
  constructor(dataSource: DataSource) {
    super(CreditNote, dataSource.createEntityManager());
  }
}
