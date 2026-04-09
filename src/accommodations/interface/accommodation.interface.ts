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

export interface AccommodationComplete {
  accommodationId: number;
  code?: string;
  name?: string;
  description?: string;
  amountPerson?: number;
  jacuzzi?: boolean;
  amountRoom?: number;
  amountBathroom?: number;
  priceBuy?: number;
  priceSale?: number;
  taxe?: number;
  categoryType?: CategoryTypeClean;
  bedType?: BedTypeClean;
  stateType?: StateTypeClean;
  updatedAt?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  images?: AccommodationImage[];
}

export interface AccommodationPublicListItem {
  accommodationId: number;
  name: string;
  description?: string;
  amountPerson: number;
  amountRoom: number;
  amountBathroom: number;
  jacuzzi: boolean;
  priceSale: number;
  categoryType: CategoryTypeClean | null;
  bedType: BedTypeClean | null;
  stateType: StateTypeClean | null;
  images: AccommodationImage[];
}
