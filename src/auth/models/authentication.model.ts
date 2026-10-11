export interface TokenPayloadModel {
  sub?: string;
  email?: string;
  id?: string;
  /**
   * Hotel de la sesión. `null` para PLATFORM_ADMIN. Ausente en los tokens
   * emitidos antes del multi-hotel (ver `checkSessionTenant`).
   */
  orgId?: string | null;
}

export interface UserAuthModel {
  email: string;
  password: string;
  id: string;
  role: string;
}
