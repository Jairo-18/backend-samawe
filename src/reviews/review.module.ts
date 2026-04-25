import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { ReviewController } from './controllers/review.controller';
import { ReviewService } from './services/review.service';
import { ReviewUC } from './useCases/reviewUC.uc';
import { ReviewRepository } from '../shared/repositories/review.repository';
import { ReviewReplyRepository } from '../shared/repositories/reviewReply.repository';
import { OrganizationalRepository } from '../shared/repositories/organizational.repository';
import { OrganizationalModule } from '../organizational/organizational.module';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    OrganizationalModule,
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    ReviewUC,
    ReviewRepository,
    ReviewReplyRepository,
    OrganizationalRepository,
  ],
})
export class ReviewModule {}
