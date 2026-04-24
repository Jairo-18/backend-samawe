import { ReviewReply } from '../entities/reviewReply.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ReviewReplyRepository extends Repository<ReviewReply> {
  constructor(dataSource: DataSource) {
    super(ReviewReply, dataSource.createEntityManager());
  }
}
