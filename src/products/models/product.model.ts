export interface ProductModel {
  id?: string;
  name: string;
  description?: string;
  amount: number;
  price: number;
  taxe: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  categoryType: CategoryType;
  availableType: AvailableType;
}

export interface CategoryType {
  id?: string;
  name?: string;
}

export interface AvailableType {
  id?: string;
  name?: string;
}
