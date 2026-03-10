import { TaxeType } from './../../shared/entities/taxeType.entity';
import { AccommodationComplete } from './../../accommodations/interface/accommodation.interface';
import { ProductComplete } from './../../products/interface/product.interface';
import { ExcursionComplete } from './../../excursions/interface/excursion.interface';

export interface InvoiceDetailInterface {
  invoiceDetailId: number;
  amountSale?: number;
  amount?: number;
  priceWithoutTax?: number;
  priceWithTax?: number;
  subtotal?: number;
  taxe?: number;
  startDate?: Date;
  endDate?: Date;
  product?: ProductComplete;
  accommodation?: AccommodationComplete;
  excursion?: ExcursionComplete;
  taxeType?: TaxeType;
  isPaid?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
  stockInfo?: any;
  invoice?: any;
}

export interface InvoiceItemAddedPayload {
  detail?: InvoiceDetailInterface;
  details?: InvoiceDetailInterface[];
  total: number;
  subtotalWithTax: number;
  subtotalWithoutTax: number;
}
