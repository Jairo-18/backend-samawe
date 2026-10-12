import { ClsStore } from 'nestjs-cls';
import { OrganizationDomainKind } from '../shared/entities/organizationDomain.entity';

/** El hotel de la petición en curso, resuelto por su host. */
export interface ResolvedTenant {
  organizationalId: string;
  /** Host ya normalizado con el que se resolvió. */
  hostname: string;
  /**
   * `internal`: fijado por código (`TenantContext.runAs`), no por un host.
   * `acting`: un administrador de plataforma eligió esta organización con el
   * selector; el host sigue siendo el del sitio desde el que entró.
   */
  kind: OrganizationDomainKind | 'internal' | 'acting';
  /** Host del panel de la plataforma: la sesión decide el hotel (ver `isPanel`). */
  isPanel?: boolean;
}

export interface TenantClsStore extends ClsStore {
  tenant?: ResolvedTenant;
}

/**
 * Rutas que se atienden SIN hotel: no leen datos de ninguno.
 * - `/` y `/health`: comprobaciones de vida del contenedor (Traefik/Dokploy).
 * - `/docs`: Swagger, protegido con usuario y contraseña propios.
 * - `/uploads`: archivos estáticos (no pasan por Nest, se deja por si acaso).
 * - `/socket.io`: el handshake; el socket valida su JWT y sus rooms van por la
 *   organización del usuario (`orders.gateway.ts`).
 */
export const TENANTLESS_PATH_PREFIXES = ['/health', '/docs', '/uploads/', '/socket.io'];
export const TENANTLESS_EXACT_PATHS = ['/', '/favicon.ico'];

export function isTenantlessPath(path: string): boolean {
  const p = path || '/';
  return (
    TENANTLESS_EXACT_PATHS.includes(p) ||
    TENANTLESS_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))
  );
}

/**
 * Normaliza un host para buscarlo en `organization_domains`: minúsculas, sin
 * puerto, sin punto final y sin `www.`. Devuelve `null` si no parece un host.
 */
export function normalizeHost(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let host = raw.trim().toLowerCase();
  // Si llega una lista (cabeceras reenviadas varias veces), el primero.
  host = host.split(',')[0].trim();
  // IPv6 entre corchetes: se conserva sin el puerto.
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    host = end > 0 ? host.slice(0, end + 1) : host;
  } else {
    host = host.replace(/:\d+$/, '');
  }
  host = host.replace(/\.$/, '').replace(/^www\./, '');
  if (!host || host.length > 253 || /[\s/@]/.test(host)) return null;
  return host;
}
