export interface TokenPayloadModel {
  sub?: string;
  email?: string;
  id?: string;
}

export interface UserAuthModel {
  email: string;
  password: string;
  id: string;
  role: string;
}
