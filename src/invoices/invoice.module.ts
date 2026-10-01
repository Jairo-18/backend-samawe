import { InvoicedPaginatedService } from './services/invoicePaginated.service';
import { InvoiceUC } from './useCases/invoiceUC.uc';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { InvoiceDetailService } from './services/invoiceDetail.service';
import { InvoiceExcelService } from './services/invoiceExcel.service';
import { InvoiceCreditService } from './services/invoiceCredit.service';
import { InvoiceCreditController } from './controllers/invoiceCredit.controller';
import { ReceivablesController } from './controllers/receivables.controller';
import { RecipeModule } from '../recipes/recipe.module';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RecipeModule,
  ],
  controllers: [
    InvoiceController,
    InvoiceCreditController,
    ReceivablesController,
  ],
  providers: [
    InvoiceService,
    InvoiceUC,
    InvoiceDetailService,
    InvoicedPaginatedService,
    InvoiceExcelService,
    InvoiceCreditService,
  ],
  exports: [InvoiceService, InvoiceDetailService],
})
export class InvoiceModule {}
