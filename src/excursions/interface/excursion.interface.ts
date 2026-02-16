import {
  StateTypeClean,
  CategoryTypeClean,
} from './../../shared/interfaces/typesClean.interface';

export interface ExcursionImage {
  excursionImageId: number;
  imageUrl: string;
  publicId?: string;
}

export interface ExcursionInterfacePaginatedList {
  excursionId: number;
  code?: string;
  name: string;
  description?: string;
  priceBuy: number;
  priceSale: number;
  stateType: StateTypeClean;
  categoryType: CategoryTypeClean;
  images: ExcursionImage[];
}
