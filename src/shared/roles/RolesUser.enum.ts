export enum RolesUser {
  /**
   * Operador de la plataforma, por encima de los hoteles: registra dominios,
   * ve la configuración de otro hotel y hace backups. No pertenece a ninguno.
   */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  PRO = 'PRO',
  CHE = 'CHE',
  MES = 'MES',
  USER = 'USER',
  EMP = 'EMP',
}
