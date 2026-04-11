export interface UserModel {
  userId?: string;
  identificationType: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phone: string;
  roleType: string;
  personType: string;
  password?: string;
  confirmPassword?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserModelComplete {
  userId?: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: PhoneCOde;
  phone: string;
  roleType: RoleType;
  personType: PersonType;
  password?: string;
  confirmPassword?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PersonType {
  personTypeId?: number;
  code?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface UpdateUserModel {
  identificationType: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phone: string;
  isActive: boolean;
  roleType: string;
  personType: string;
  organizationalId?: string;
  password?: string;
  confirmPassword?: string;
}

export interface IdentificationType {
  identificationTypeId?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface RoleType {
  roleTypeId?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface PhoneCOde {
  phoneCodeId?: string;
  code: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface ChangePasswordModel {
  id?: string;
  password?: string;
  confirmPassword?: string;
}

export interface UserFiltersModel {
  where?: UserWhereModel;
  relations?: string[];
}

export interface UserWhereModel {
  id?: string;
  identification?: string;
  email?: string;
}
