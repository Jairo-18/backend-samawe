import { ProductService } from './../services/product.service';
import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dtos/product.dto';

@Injectable()
export class ProductUC {
  constructor(private readonly _productService: ProductService) {}

  async create(product: CreateProductDto) {
    return await this._productService.create(product);
  }

  async findAll() {
    return await this._productService.findAll();
  }

  async findOne(productId: string) {
    return await this._productService.findOne(productId);
  }

  async delete(productId: string) {
    return await this._productService.delete(productId);
  }
}
