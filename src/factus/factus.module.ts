import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FactusAuthService } from './services/factus-auth.service';
import { FactusBillsService } from './services/factus-bills.service';
import { FactusInvoiceService } from './services/factus-invoice.service';
import { FactusCreditNoteService } from './services/factus-credit-note.service';
import { FactusSupportDocumentService } from './services/factus-support-document.service';
import { FactusNumberingService } from './services/factus-numbering.service';
import { FactusClient } from './factus.client';
import { FactusAuthController } from './controllers/factus-auth.controller';
import { FactusBillsController } from './controllers/factus-bills.controller';
import { FactusInvoiceController } from './controllers/factus-invoice.controller';
import { FactusCreditNotesController } from './controllers/factus-credit-notes.controller';
import { FactusSupportDocumentsController } from './controllers/factus-support-documents.controller';
import { FactusNumberingRangesController } from './controllers/factus-numbering-ranges.controller';
import { SharedModule } from '../shared/shared.module';
import { RecipeModule } from '../recipes/recipe.module';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RecipeModule,
  ],
  controllers: [
    FactusAuthController,
    FactusBillsController,
    FactusInvoiceController,
    FactusCreditNotesController,
    FactusSupportDocumentsController,
    FactusNumberingRangesController,
  ],
  providers: [
    FactusAuthService,
    FactusBillsService,
    FactusInvoiceService,
    FactusCreditNoteService,
    FactusSupportDocumentService,
    FactusNumberingService,
    FactusClient,
  ],
  exports: [
    FactusAuthService,
    FactusBillsService,
    FactusInvoiceService,
    FactusCreditNoteService,
    FactusSupportDocumentService,
    FactusNumberingService,
    FactusClient,
  ],
})
export class FactusModule {}
