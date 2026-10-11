import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationDomain } from '../shared/entities/organizationDomain.entity';
import { TtlCache } from '../shared/utils/ttl-cache';
import { normalizeHost, ResolvedTenant } from './tenant.types';

/** Lo que tarda en verse un dominio nuevo o desactivado en ESTA instancia. */
const CACHE_TTL_MS = 60_000;
/**
 * Los hosts desconocidos también se cachean: un escáner que pruebe cabeceras
 * `Host` al azar no debe convertirse en una consulta a la base por petición.
 * El tope de `TtlCache` impide que esos hosts llenen la memoria.
 */
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { tenant: ResolvedTenant | null };

/**
 * Resuelve qué hotel atiende un host. Sin coincidencia activa devuelve `null`:
 * quien llama debe rechazar la petición — nunca hay hotel por defecto.
 *
 * La caché es por proceso (como la del tablero): con varias instancias, cada
 * una ve un dominio nuevo como mucho `CACHE_TTL_MS` después; `invalidate()`
 * solo limpia la instancia que lo llama.
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private readonly _cache = new TtlCache<CacheEntry>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

  constructor(
    @InjectRepository(OrganizationDomain)
    private readonly _domainRepository: Repository<OrganizationDomain>,
  ) {}

  async resolve(rawHost: string | undefined | null): Promise<ResolvedTenant | null> {
    const hostname = normalizeHost(rawHost);
    if (!hostname) return null;

    const cached = this._cache.get(hostname);
    if (cached) return cached.tenant;

    const domain = await this._domainRepository.findOne({
      where: { hostname, status: 'active' },
      relations: ['organizational'],
    });
    // Un hotel desactivado (`Organizational.status = false`) tampoco resuelve.
    const tenant: ResolvedTenant | null =
      domain && domain.organizational?.status !== false
        ? {
            organizationalId: domain.organizationalId,
            hostname,
            kind: domain.kind,
          }
        : null;

    if (!tenant) {
      this.logger.debug(`Host sin hotel: ${hostname}`);
    }
    this._cache.set(hostname, { tenant });
    return tenant;
  }

  /** Llamar al registrar, activar o desactivar un dominio. */
  invalidate(): void {
    this._cache.clear();
  }
}
