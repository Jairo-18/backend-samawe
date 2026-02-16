import { RestaurantOrderService } from './services/restaurant-order.service';
import { RestaurantOrderController } from './controllers/restaurant-order.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { RecipeModule } from './../recipes/recipe.module';
import { InvoiceRepository } from './../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../shared/repositories/stateType.repository';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RecipeModule, // Importamos para usar RecipeService
  ],
  controllers: [RestaurantOrderController],
  providers: [
    RestaurantOrderService,
    InvoiceRepository,
    InvoiceDetaillRepository,
    StateTypeRepository,
  ],
  exports: [RestaurantOrderService],
})
export class RestaurantModule {}
