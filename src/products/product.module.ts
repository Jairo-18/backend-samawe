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
    TypeOrmModule.forFeature([Product, CategoryType, AvailableType]),
  ],
  providers: [
    ProductService,
    ProductUC,
    CategoryTypeRepository,
    AvailableTypeRepository,
    ProductRepository,
  ],
})
export class ProductModule {}
