import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewRepository } from '../../shared/repositories/review.repository';
import { ReviewReplyRepository } from '../../shared/repositories/reviewReply.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  CreateReviewDto,
  UpdateReviewDto,
  CreateReviewReplyDto,
  UpdateReviewReplyDto,
} from '../dtos/review.dto';
import { Review } from '../../shared/entities/review.entity';
import { ReviewReply } from '../../shared/entities/reviewReply.entity';

@Injectable()
export class ReviewService {
  constructor(
    private readonly _reviewRepository: ReviewRepository,
    private readonly _reviewReplyRepository: ReviewReplyRepository,
    private readonly _userRepository: UserRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  async findAll(organizationalId?: string): Promise<Review[]> {
    return this._reviewRepository.find({
      where: organizationalId
        ? { organizational: { organizationalId } }
        : undefined,
      relations: ['user', 'replies', 'replies.user', 'organizational'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(reviewId: number): Promise<Review> {
    const review = await this._reviewRepository.findOne({
      where: { reviewId },
      relations: ['user', 'replies', 'replies.user', 'organizational'],
    });

    if (!review) {
      throw new NotFoundException(`Reseña con ID ${reviewId} no encontrada`);
    }

    return review;
  }

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const user = await this._userRepository.findOne({ where: { userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const { organizationalId, ...reviewData } = dto;
    const organizational = await this._organizationalRepository.findOne({
      where: { organizationalId },
    });
    if (!organizational)
      throw new BadRequestException('Organización no encontrada');

    const review = this._reviewRepository.create({
      ...reviewData,
      user,
      organizational,
    });
    return this._reviewRepository.save(review);
  }

  async update(
    reviewId: number,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this._reviewRepository.findOne({
      where: { reviewId },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException(`Reseña con ID ${reviewId} no encontrada`);
    }

    if (review.user.userId !== userId) {
      throw new ForbiddenException(
        'No puedes editar una reseña que no es tuya',
      );
    }

    Object.assign(review, dto);
    return this._reviewRepository.save(review);
  }

  async remove(reviewId: number, userId: string): Promise<void> {
    const review = await this._reviewRepository.findOne({
      where: { reviewId },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException(`Reseña con ID ${reviewId} no encontrada`);
    }

    if (review.user.userId !== userId) {
      throw new ForbiddenException(
        'No puedes eliminar una reseña que no es tuya',
      );
    }

    await this._reviewRepository.softDelete(reviewId);
  }

  async createReply(
    reviewId: number,
    userId: string,
    dto: CreateReviewReplyDto,
  ): Promise<ReviewReply> {
    const review = await this._reviewRepository.findOne({
      where: { reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Reseña con ID ${reviewId} no encontrada`);
    }

    const user = await this._userRepository.findOne({ where: { userId } });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const reply = this._reviewReplyRepository.create({ ...dto, review, user });
    return this._reviewReplyRepository.save(reply);
  }

  async updateReply(
    reviewReplyId: number,
    userId: string,
    dto: UpdateReviewReplyDto,
  ): Promise<ReviewReply> {
    const reply = await this._reviewReplyRepository.findOne({
      where: { reviewReplyId },
      relations: ['user'],
    });

    if (!reply) {
      throw new NotFoundException(
        `Respuesta con ID ${reviewReplyId} no encontrada`,
      );
    }

    if (reply.user.userId !== userId) {
      throw new ForbiddenException(
        'No puedes editar una respuesta que no es tuya',
      );
    }

    Object.assign(reply, dto);
    return this._reviewReplyRepository.save(reply);
  }

  async removeReply(reviewReplyId: number, userId: string): Promise<void> {
    const reply = await this._reviewReplyRepository.findOne({
      where: { reviewReplyId },
      relations: ['user'],
    });

    if (!reply) {
      throw new NotFoundException(
        `Respuesta con ID ${reviewReplyId} no encontrada`,
      );
    }

    if (reply.user.userId !== userId) {
      throw new ForbiddenException(
        'No puedes eliminar una respuesta que no es tuya',
      );
    }

    await this._reviewReplyRepository.softDelete(reviewReplyId);
  }
}
