import { CategoryTypeClean } from './../../shared/interfaces/typesClean.interface';

export interface ProductImageClean {
  productImageId: number;
  imageUrl: string;
  publicId: string;
}

export interface ProductInterfacePaginatedList {
  productId: number;
  code?: string;
  name: string;
  description?: string;
  amount?: number;
  priceBuy: number;
  priceSale: number;
  isActive: boolean;
  categoryType: CategoryTypeClean;
  images: ProductImageClean[];
}
