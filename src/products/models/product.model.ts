export interface ProductModel {
  id?: string;
  name: string;
  description?: string;
  amount: number;
  price: number;
  categoryType: CategoryType;
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
