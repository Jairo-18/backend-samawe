import { UpdateProductDto } from '../dtos/product.dto';
import { ProductService } from '../services/product.service';
import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dtos/product.dto';

@Injectable()
export class ProductUC {
  constructor(private readonly _productService: ProductService) {}

  async create(productId: CreateProductDto) {
    return await this._productService.create(productId);
  }

  async update(productId: string, productData: UpdateProductDto) {
    return await this._productService.update(productId, productData);
  }

  async findAll() {
    return await this._productService.findAll();
  }

  async findOne(productId: string) {
    return await this._productService.findOne(productId);
  }

  async delete(productId: number) {
    return await this._productService.delete(productId);
  }
}
