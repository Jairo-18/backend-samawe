import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FactusAuthService } from './services/factus-auth.service';
import { FactusBillsService } from './services/factus-bills.service';
import { FactusInvoiceService } from './services/factus-invoice.service';
import { FactusCreditNoteService } from './services/factus-credit-note.service';
import { FactusClient } from './factus.client';
import { FactusAuthController } from './controllers/factus-auth.controller';
import { FactusBillsController } from './controllers/factus-bills.controller';
import { FactusInvoiceController } from './controllers/factus-invoice.controller';
import { FactusCreditNotesController } from './controllers/factus-credit-notes.controller';
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
  ],
  providers: [
    FactusAuthService,
    FactusBillsService,
    FactusInvoiceService,
    FactusCreditNoteService,
    FactusClient,
  ],
  exports: [
    FactusAuthService,
    FactusBillsService,
    FactusInvoiceService,
    FactusCreditNoteService,
    FactusClient,
  ],
})
export class FactusModule {}
