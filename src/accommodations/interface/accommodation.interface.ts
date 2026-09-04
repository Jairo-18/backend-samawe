import {
  StateTypeClean,
  CategoryTypeClean,
  BedTypeClean,
  TaxeTypeClean,
} from './../../shared/interfaces/typesClean.interface';

export interface AccommodationImage {
  accommodationImageId: number;
  imageUrl: string;
  publicId: string;
}

export interface AccommodationInterfacePaginatedList {
  accommodationId: number;
  code?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  amountPerson?: number;
  jacuzzi: boolean;
  amountRoom?: number;
  amountBathroom?: number;
  priceBuy: number;
  priceSale: number;
  stateType: StateTypeClean;
  bedType: BedTypeClean;
  categoryType: CategoryTypeClean;
  taxeType: TaxeTypeClean;
  images: AccommodationImage[];
}

export interface AccommodationComplete {
  accommodationId: number;
  code?: string;
  name?: Record<string, string>;
  description?: Record<string, string>;
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
  name: Record<string, string>;
  description?: Record<string, string>;
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

/**
 * Ficha pública de un hospedaje. Añade `code` sobre el item de listado, que la
 * página de detalle usa para la URL legible y como referencia visible.
 * Deliberadamente NO expone `priceBuy` ni el `organizationalId`: es un endpoint
 * sin autenticación.
 */
export interface AccommodationPublicDetail extends AccommodationPublicListItem {
  code?: string;
}

/**
 * Un tramo ocupado. Solo fechas: este endpoint es público, así que no sale de
 * aquí nada del huésped ni de la factura.
 *
 * El intervalo es SEMIABIERTO: `endDate` es el momento de salida y ese día ya
 * está libre para una nueva entrada.
 */
export interface AccommodationOccupiedRange {
  startDate: string;
  endDate: string;
}
