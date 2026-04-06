import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { BenefitSectionController } from './controllers/benefitSection.controller';
import { BenefitSectionService } from './services/benefitSection.service';
import { BenefitSectionUC } from './useCases/benefitSection.uc';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [BenefitSectionController],
  providers: [BenefitSectionUC, BenefitSectionService],
  exports: [BenefitSectionService],
})
export class BenefitSectionModule {}
