import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DebitNote } from '../entities/debitNote.entity';

@Injectable()
export class DebitNoteRepository extends Repository<DebitNote> {
  constructor(dataSource: DataSource) {
    super(DebitNote, dataSource.createEntityManager());
  }
}
