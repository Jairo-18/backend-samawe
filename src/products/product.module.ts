import { RepositoryService } from './../shared/services/repositoriry.service';
import { TaxeType } from './../shared/entities/taxeType.entity';
import { CrudProductUseCase } from './useCases/crudProduct.uc';
import { CrudProductService } from './services/crudProduct.service';
import { TaxeTypeRepository } from './../shared/repositories/taxeType.repository';
import { ProductUC } from './useCases/product.uc';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { AvailableType } from './../shared/entities/availableType.entity';
import { CategoryType } from './../shared/entities/categoryType.entity';
import { Product } from './../shared/entities/product.entity';
import { ProductRepository } from './../shared/repositories/product.repository';
import { AvailableTypeRepository } from './../shared/repositories/available.repository';
import { CategoryTypeRepository } from './../shared/repositories/categoryType.repository';
import { SharedModule } from './../shared/shared.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [ProductController],
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Product, CategoryType, AvailableType, TaxeType]),
  ],
  providers: [
    ProductService,
    CrudProductService,
    CrudProductUseCase,
    ProductUC,
    CategoryTypeRepository,
    AvailableTypeRepository,
    ProductRepository,
    TaxeTypeRepository,
    RepositoryService,
  ],
})
export class ProductModule {}
