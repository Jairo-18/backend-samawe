import {
  CanActivate,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import { TenantContext } from '../../tenant/tenant-context.service';

/**
 * Hasta la fase 2 multi-hotel, las credenciales de Factus del `.env` son las de
 * Samawe (su NIT, su resolución DIAN, sus rangos). Este guard impide que
 * cualquier OTRA organización —el admin de un hotel nuevo, o el super
 * administrador "dentro" de otra organización con el selector— llegue a
 * Factus: lo que emitiera saldría a la DIAN con la identidad de Samawe.
 *
 * Falla cerrado: sin organización resuelta, tampoco pasa. Se retira cuando
 * cada organización tenga su propia configuración de Factus.
 */
export const LEGACY_FACTUS_OWNER_SLUG = 'ecohotelsamawe';

@Injectable()
export class FactusOrganizationGuard implements CanActivate {
  private readonly logger = new Logger(FactusOrganizationGuard.name);
  /** `organizationalId` → slug. Los slugs no se editan, así que no caduca. */
  private static readonly _slugCache = new Map<string, string | null>();

  constructor(
    private readonly _tenant: TenantContext,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  async canActivate(): Promise<boolean> {
    const organizationalId = this._tenant.organizationalId;
    const slug = organizationalId ? await this._slugOf(organizationalId) : null;
    if (slug === LEGACY_FACTUS_OWNER_SLUG) return true;

    this.logger.warn(
      `Factus bloqueado para la organización ${organizationalId ?? '(ninguna)'} (${slug ?? '?'}).`,
    );
    // 409 y no 403: el front no muestra los 403 (los trata como "sin permiso"
    // silencioso), y aquí el usuario tiene que leer por qué no se emitió.
    throw new ConflictException(
      'La facturación electrónica de esta organización todavía no está configurada. ' +
        'No se puede usar la cuenta de Factus de otra organización.',
    );
  }

  private async _slugOf(organizationalId: string): Promise<string | null> {
    const cache = FactusOrganizationGuard._slugCache;
    if (cache.has(organizationalId)) return cache.get(organizationalId)!;
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
      select: { organizationalId: true, slug: true },
    });
    const slug = org?.slug ?? null;
    if (slug) cache.set(organizationalId, slug);
    return slug;
  }
}
