import { CrudProductService } from './services/crudProduct.service';
import { ProductService } from './services/product.service';
import { CrudProductUC } from './useCases/crudProductUC.uc';
import { ProductUC } from './useCases/productUC.uc';
import { ProductController } from './controllers/product.controller';
import { LocalStorageModule } from './../local-storage/local-storage.module';
import { ProductImageService } from './services/productImage.service';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    LocalStorageModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductUC,
    CrudProductUC,
    ProductService,
    CrudProductService,
    ProductImageService,
  ],
})
export class ProductModule {}
