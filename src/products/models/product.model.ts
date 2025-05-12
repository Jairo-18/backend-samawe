export interface ProductModel {
  id?: string;
  name: string;
  description?: string;
  amount: number;
  price: number;
  taxe: number;
  categoryType: CategoryType;
  availableType: AvailableType;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface CategoryType {
  id?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface AvailableType {
  id?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
