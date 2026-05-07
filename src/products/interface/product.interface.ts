import { CategoryTypeClean, TaxeTypeClean } from './../../shared/interfaces/typesClean.interface';

export interface ProductImageClean {
  productImageId: number;
  imageUrl: string;
  publicId: string;
}

export interface UnitOfMeasureClean {
  unitOfMeasureId: number;
  code?: string;
  name?: Record<string, string>;
}

export interface ProductInterfacePaginatedList {
  productId: number;
  code?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  amount?: number;
  priceBuy: number;
  priceSale: number;
  isActive: boolean;
  categoryType: CategoryTypeClean;
  unitOfMeasure?: UnitOfMeasureClean | null;
  taxeType?: TaxeTypeClean | null;
  images: ProductImageClean[];
}

export interface ProductComplete {
  productId: number;
  code?: string;
  name?: Record<string, string>;
  description?: Record<string, string>;
  amount?: number;
  taxe?: number;
  priceBuy?: number;
  priceSale?: number;
  isActive?: boolean;
  categoryType?: CategoryTypeClean;
  unitOfMeasure?: UnitOfMeasureClean;
  updatedAt?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  images?: ProductImageClean[];
}
