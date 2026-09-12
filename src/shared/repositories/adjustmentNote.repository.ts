import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdjustmentNote } from '../entities/adjustmentNote.entity';

@Injectable()
export class AdjustmentNoteRepository extends Repository<AdjustmentNote> {
  constructor(dataSource: DataSource) {
    super(AdjustmentNote, dataSource.createEntityManager());
  }
}
