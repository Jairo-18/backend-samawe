import {
  StateTypeClean,
  CategoryTypeClean,
  BedTypeClean,
} from './../../shared/interfaces/typesClean.interface';

export interface AccommodationImage {
  accommodationImageId: number;
  imageUrl: string;
  publicId: string;
}

export interface AccommodationInterfacePaginatedList {
  accommodationId: number;
  code?: string;
  name: string;
  description?: string;
  amountPerson?: number;
  jacuzzi: boolean;
  amountRoom?: number;
  amountBathroom?: number;
  priceBuy: number;
  priceSale: number;
  stateType: StateTypeClean;
  bedType: BedTypeClean;
  categoryType: CategoryTypeClean;
  images: AccommodationImage[];
}
