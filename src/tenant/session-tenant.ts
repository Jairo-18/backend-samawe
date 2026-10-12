import { RolesUser } from '../shared/roles/RolesUser.enum';
import { ResolvedTenant } from './tenant.types';

/** Lo mínimo de un usuario para decidir si su sesión vale en este hotel. */
export interface SessionUserLike {
  organizationalId?: string | null;
  organizational?: { organizationalId?: string | null } | null;
  roleType?: { code?: string | null } | null;
}

export type SessionTenantRejection =
  | 'no-tenant'
  | 'user-without-org'
  | 'user-other-org'
  | 'token-other-org';

/** `reason` solo viene cuando `ok` es `false`. */
export interface SessionTenantCheck {
  ok: boolean;
  reason?: SessionTenantRejection;
}

export function userOrganizationalId(user: SessionUserLike): string | null {
  return user.organizationalId ?? user.organizational?.organizationalId ?? null;
}

export function isPlatformAdmin(user: SessionUserLike): boolean {
  return user.roleType?.code === RolesUser.PLATFORM_ADMIN;
}

/**
 * Quien administra la plataforma: puede entrar a CUALQUIER organización con el
 * selector "Cambiar de organización". Hoy el SUPERADMIN (decisión del dueño) y
 * PLATFORM_ADMIN. La cuenta de un hotel nuevo tiene que ser ADMIN, nunca
 * SUPERADMIN, o vería y entraría a todos los hoteles.
 */
export function isPlatformManager(user: SessionUserLike): boolean {
  const code = user.roleType?.code;
  return code === RolesUser.SUPERADMIN || code === RolesUser.PLATFORM_ADMIN;
}

/**
 * La organización en la que OPERA la sesión.
 * - Usuario normal: la suya (y `checkSessionTenant` exige que sea la del host).
 * - Administrador de plataforma: la que eligió con el selector (va en el token);
 *   si no eligió ninguna, la suya; y si no tiene (PLATFORM_ADMIN), la del host.
 */
export function effectiveOrganizationalId(
  user: SessionUserLike,
  tokenOrgId: string | null | undefined,
  tenant: ResolvedTenant | undefined,
): string | null {
  if (isPlatformManager(user)) {
    return tokenOrgId || userOrganizationalId(user) || tenant?.organizationalId || null;
  }
  return userOrganizationalId(user);
}

/**
 * ¿Vale la sesión de `user` en el hotel `tenant`?
 *
 * - Sin hotel resuelto → no (nunca se elige uno).
 * - El usuario tiene que ser DE ese hotel (su organización en la base, que es la
 *   verdad; el token puede ser viejo).
 * - Si el token trae `orgId`, también tiene que ser ese hotel. Los tokens
 *   emitidos antes de esta fase no lo traen: valen mientras el usuario sea del
 *   hotel, y el siguiente refresh ya los emite con `orgId`.
 * - SUPERADMIN y PLATFORM_ADMIN (administradores de plataforma) valen en
 *   cualquier host conocido: operan en la organización de su token
 *   (`effectiveOrganizationalId`).
 * - Host del PANEL (`isPanel`): vale la sesión de un usuario de CUALQUIER hotel,
 *   y la petición opera en el suyo (`AuthService.applyEffectiveOrganization`).
 *   El token, si trae `orgId`, tiene que ser el de su usuario. Así un solo
 *   panel y una sola API sirven a todos los hoteles, sin que el front adivine
 *   a qué API mandar cada petición.
 */
export function checkSessionTenant(
  user: SessionUserLike,
  tokenOrgId: string | null | undefined,
  tenant: ResolvedTenant | undefined,
): SessionTenantCheck {
  if (!tenant?.organizationalId) return { ok: false, reason: 'no-tenant' };

  // El administrador de plataforma puede estar "dentro" de otra organización
  // (selector): su token no tiene por qué coincidir con el host. Sigue haciendo
  // falta un host conocido.
  if (isPlatformManager(user)) return { ok: true };

  const userOrg = userOrganizationalId(user);
  if (tenant.isPanel) {
    if (!userOrg) return { ok: false, reason: 'user-without-org' };
    if (tokenOrgId && tokenOrgId !== userOrg) {
      return { ok: false, reason: 'token-other-org' };
    }
    return { ok: true };
  }

  if (tokenOrgId && tokenOrgId !== tenant.organizationalId) {
    return { ok: false, reason: 'token-other-org' };
  }

  if (!userOrg) return { ok: false, reason: 'user-without-org' };
  if (userOrg !== tenant.organizationalId) {
    return { ok: false, reason: 'user-other-org' };
  }
  return { ok: true };
}

/** El `orgId` que se firma en el JWT: el del usuario, o `null` si es de plataforma. */
export function tokenOrgIdFor(user: SessionUserLike): string | null {
  return isPlatformAdmin(user) ? null : userOrganizationalId(user);
}
