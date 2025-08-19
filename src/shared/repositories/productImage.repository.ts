import { ProductImage } from './../entities/productImage.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ProductImageRepository extends Repository<ProductImage> {
  constructor(dataSource: DataSource) {
    super(ProductImage, dataSource.createEntityManager());
  }
}
