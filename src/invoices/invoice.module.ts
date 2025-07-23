import { InvoicedPaginatedService } from './services/invoicePaginated.service';
import { InvoiceUC } from './useCases/invoiceUC.uc';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { InvoiceDetailService } from './services/invoiceDetail.service';
import { InvoiceDetaillMultiple } from './services/invoiceDetaillMultiple.service';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceUC,
    InvoiceDetailService,
    InvoicedPaginatedService,
    InvoiceDetaillMultiple,
  ],
})
export class InvoiceModule {}
