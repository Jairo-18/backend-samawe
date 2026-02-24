import { RestaurantOrderService } from './services/restaurantOrder.service';
import { RestaurantOrderController } from './controllers/restaurantOrder.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { RecipeModule } from './../recipes/recipe.module';
import { InvoiceRepository } from './../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../shared/repositories/stateType.repository';
import { UpdateOrderStateUseCase } from './useCases/restaurantOrderUC.uc';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RecipeModule,
  ],
  controllers: [RestaurantOrderController],
  providers: [
    RestaurantOrderService,
    UpdateOrderStateUseCase,
    InvoiceRepository,
    InvoiceDetaillRepository,
    StateTypeRepository,
  ],
  exports: [RestaurantOrderService],
})
export class RestaurantModule {}
