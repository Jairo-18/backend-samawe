export interface UserModel {
  id?: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  role: Role;
  identificationType: IdentificationType;
  email: string;
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
