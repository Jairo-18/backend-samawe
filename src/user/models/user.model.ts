export interface UserModel {
  id?: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  password?: string;
  confirmPassword?: string;
}

export interface UpdateUserModel {
  identificationType: IdentificationType;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  password?: string;
  confirmPassword?: string;
}

export interface IdentificationType {
  id?: string;
  name?: string;
}

export interface Role {
  id?: string;
  name?: string;
}

export interface ChangePasswordModel {
  id?: string;
  password?: string;
  confirmPassword?: string;
}
