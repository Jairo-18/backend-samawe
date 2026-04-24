import { Injectable } from '@nestjs/common';
import { ReviewService } from '../services/review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  CreateReviewReplyDto,
  UpdateReviewReplyDto,
} from '../dtos/review.dto';

@Injectable()
export class ReviewUC {
  constructor(private readonly _reviewService: ReviewService) {}

  async findAll(organizationalId?: string) {
    return this._reviewService.findAll(organizationalId);
  }

  async findOne(reviewId: number) {
    return this._reviewService.findOne(reviewId);
  }

  async create(userId: string, dto: CreateReviewDto) {
    return this._reviewService.create(userId, dto);
  }

  async update(reviewId: number, userId: string, dto: UpdateReviewDto) {
    return this._reviewService.update(reviewId, userId, dto);
  }

  async remove(reviewId: number, userId: string) {
    return this._reviewService.remove(reviewId, userId);
  }

  async createReply(
    reviewId: number,
    userId: string,
    dto: CreateReviewReplyDto,
  ) {
    return this._reviewService.createReply(reviewId, userId, dto);
  }

  async updateReply(
    reviewReplyId: number,
    userId: string,
    dto: UpdateReviewReplyDto,
  ) {
    return this._reviewService.updateReply(reviewReplyId, userId, dto);
  }

  async removeReply(reviewReplyId: number, userId: string) {
    return this._reviewService.removeReply(reviewReplyId, userId);
  }
}
