import { InvoicedPaginatedService } from './services/invoicePaginated.service';
import { InvoiceUC } from './useCases/invoiceUC.uc';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { InvoiceDetailService } from './services/invoiceDetail.service';
import { RecipeModule } from '../recipes/recipe.module';
import { RecipeService } from '../recipes/services/recipe.service';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RecipeModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceUC,
    InvoiceDetailService,
    InvoicedPaginatedService,
    RecipeService,
  ],
  exports: [InvoiceService, InvoiceDetailService],
})
export class InvoiceModule {}
