import { CrudProductService } from './services/crudProduct.service';
import { ProductService } from './services/product.service';
import { CrudProductUC } from './useCases/crudProductUC.uc';
import { ProductUC } from './useCases/productUC.uc';
import { ProductController } from './controllers/product.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [ProductController],
  providers: [ProductUC, CrudProductUC, ProductService, CrudProductService],
})
export class ProductModule {}
