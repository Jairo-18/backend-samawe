import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuthService } from '../auth/services/auth.service';
import { FactusOrganizationGuard } from '../factus/guards/factus-organization.guard';
import { TenantContext } from './tenant-context.service';
import { checkSessionTenant, effectiveOrganizationalId } from './session-tenant';
import { ResolvedTenant, TenantClsStore } from './tenant.types';
import { ClsServiceManager } from 'nestjs-cls';

/**
 * Selector "Cambiar de organización" del super administrador, y el bloqueo de
 * Factus para toda organización que no sea la dueña de la cuenta del `.env`.
 */
const SAMAWE = 'org-samawe';
const HOTEL2 = 'org-hotel2';
const hostSamawe: ResolvedTenant = {
  organizationalId: SAMAWE,
  hostname: 'api.ecohotelsamawe.com',
  kind: 'api',
};
const superadmin = { userId: 'u-sa', organizationalId: SAMAWE, roleType: { code: 'SUPERADMIN' } };
const admin = { userId: 'u-ad', organizationalId: SAMAWE, roleType: { code: 'ADMIN' } };

describe('reglas de sesión del administrador de plataforma', () => {
  it('SUPERADMIN con otra organización elegida es válido en el host de Samawe', () => {
    expect(checkSessionTenant(superadmin, HOTEL2, hostSamawe)).toEqual({ ok: true });
  });

  it('un ADMIN con un token de otra organización sigue rechazado', () => {
    expect(checkSessionTenant(admin, HOTEL2, hostSamawe)).toMatchObject({
      ok: false,
      reason: 'token-other-org',
    });
  });

  it('organización efectiva: la elegida, si no la propia, si no la del host', () => {
    expect(effectiveOrganizationalId(superadmin, HOTEL2, hostSamawe)).toBe(HOTEL2);
    expect(effectiveOrganizationalId(superadmin, undefined, hostSamawe)).toBe(SAMAWE);
    expect(
      effectiveOrganizationalId(
        { organizationalId: null, roleType: { code: 'PLATFORM_ADMIN' } },
        undefined,
        hostSamawe,
      ),
    ).toBe(SAMAWE);
    // Para un usuario normal el token no manda: siempre la suya.
    expect(effectiveOrganizationalId(admin, HOTEL2, hostSamawe)).toBe(SAMAWE);
  });
});

describe('host del panel (isPanel): la sesión decide el hotel', () => {
  const panel: ResolvedTenant = { ...hostSamawe, isPanel: true };
  const hotelHost: ResolvedTenant = {
    organizationalId: HOTEL2,
    hostname: 'api-crazylove.ecohotelsamawe.com',
    kind: 'api',
  };
  const adminHotel2 = { userId: 'u-h2', organizationalId: HOTEL2, roleType: { code: 'ADMIN' } };

  it('el admin de otro hotel vale en el panel (con su token o uno viejo sin orgId)', () => {
    expect(checkSessionTenant(adminHotel2, HOTEL2, panel)).toEqual({ ok: true });
    expect(checkSessionTenant(adminHotel2, undefined, panel)).toEqual({ ok: true });
  });

  it('en el panel, un token con un hotel que no es el del usuario se rechaza', () => {
    expect(checkSessionTenant(adminHotel2, SAMAWE, panel)).toMatchObject({
      ok: false,
      reason: 'token-other-org',
    });
  });

  it('un usuario sin hotel no vale ni en el panel', () => {
    expect(checkSessionTenant({ organizationalId: null, roleType: { code: 'ADMIN' } }, undefined, panel))
      .toMatchObject({ ok: false, reason: 'user-without-org' });
  });

  it('la API de un hotel sigue estricta: una sesión de Samawe no entra', () => {
    expect(checkSessionTenant(admin, SAMAWE, hotelHost)).toMatchObject({ ok: false });
  });

  it('en el panel la petición opera en el hotel del usuario', () => {
    const cls = ClsServiceManager.getClsService<TenantClsStore>();
    return cls.run(async () => {
      cls.set('tenant', panel);
      const tenant = new TenantContext(cls as ClsService<TenantClsStore>);
      const service = new AuthService(
        {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
        tenant, {} as never,
      );
      service.applyEffectiveOrganization(adminHotel2, HOTEL2);
      expect(tenant.organizationalId).toBe(HOTEL2);
      expect(tenant.tenant?.isPanel).toBe(true);
    });
  });

  it('fuera del panel no cambia el hotel de un usuario normal', () => {
    const cls = ClsServiceManager.getClsService<TenantClsStore>();
    return cls.run(async () => {
      cls.set('tenant', hostSamawe);
      const tenant = new TenantContext(cls as ClsService<TenantClsStore>);
      const service = new AuthService(
        {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
        tenant, {} as never,
      );
      service.applyEffectiveOrganization(adminHotel2, HOTEL2);
      expect(tenant.organizationalId).toBe(SAMAWE);
    });
  });
});

describe('AuthService — cambio de organización', () => {
  const build = (orgs: Record<string, { organizationalId: string; slug: string; name: string }>) => {
    const cls = ClsServiceManager.getClsService<TenantClsStore>();
    const tenant = new TenantContext(cls as ClsService<TenantClsStore>);
    const sessions = { replaceAccessToken: jest.fn(async () => undefined) };
    const jwt = { sign: jest.fn((p: { orgId: string }) => `token-${p.orgId}`) };
    const config = { get: jest.fn(() => 'x') };
    const orgRepo = {
      findOne: jest.fn(async ({ where }: { where: { organizationalId: string } }) =>
        orgs[where.organizationalId] ?? null,
      ),
    };
    const service = new AuthService(
      {} as never,
      jwt as never,
      config as never,
      sessions as never,
      {} as never,
      {} as never,
      tenant,
      orgRepo as never,
    );
    return { service, sessions, jwt, cls, tenant };
  };
  const orgs = {
    [HOTEL2]: { organizationalId: HOTEL2, slug: 'hotel2', name: 'Hotel 2' },
    [SAMAWE]: { organizationalId: SAMAWE, slug: 'ecohotelsamawe', name: 'Samawé' },
  };

  it('emite un token con la organización elegida y actualiza la sesión', async () => {
    const { service, sessions, jwt } = build(orgs);
    const res = await service.switchOrganization(superadmin, 'token-viejo', HOTEL2);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: HOTEL2, sub: 'u-sa' }),
      expect.anything(),
    );
    expect(sessions.replaceAccessToken).toHaveBeenCalledWith('u-sa', 'token-viejo', `token-${HOTEL2}`);
    expect(res).toMatchObject({
      organization: { organizationalId: HOTEL2, slug: 'hotel2' },
      homeOrganizationalId: SAMAWE,
      isActingOrganization: true,
    });
  });

  it('volver a la propia ya no es "actuando"', async () => {
    const { service } = build(orgs);
    const res = await service.switchOrganization(superadmin, 't', SAMAWE);
    expect(res.isActingOrganization).toBe(false);
  });

  it('un ADMIN no puede cambiar de organización', async () => {
    const { service } = build(orgs);
    await expect(service.switchOrganization(admin, 't', HOTEL2)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('organización inexistente → 404', async () => {
    const { service } = build(orgs);
    await expect(service.switchOrganization(superadmin, 't', 'nada')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('en cada petición, la elegida pasa a ser el hotel y la de req.user', async () => {
    const { service, cls, tenant } = build(orgs);
    await cls.run(async () => {
      cls.set('tenant', hostSamawe);
      const user = service.applyEffectiveOrganization({ ...superadmin }, HOTEL2);
      expect(tenant.organizationalId).toBe(HOTEL2);
      expect(user).toMatchObject({
        organizationalId: HOTEL2,
        homeOrganizationalId: SAMAWE,
        isActingOrganization: true,
      });
    });
  });

  it('a un usuario normal no se le cambia nada', async () => {
    const { service, cls, tenant } = build(orgs);
    await cls.run(async () => {
      cls.set('tenant', hostSamawe);
      const user = service.applyEffectiveOrganization({ ...admin }, HOTEL2);
      expect(tenant.organizationalId).toBe(SAMAWE);
      expect(user.organizationalId).toBe(SAMAWE);
    });
  });
});

describe('FactusOrganizationGuard', () => {
  const build = (orgId: string | undefined, slug: string | null) => {
    const tenant = { organizationalId: orgId } as unknown as TenantContext;
    const repo = {
      findOne: jest.fn(async () => (slug ? { organizationalId: orgId, slug } : null)),
    };
    return new FactusOrganizationGuard(tenant, repo as never);
  };

  it('deja pasar a Samawe (dueña de la cuenta de Factus del .env)', async () => {
    await expect(build('g-samawe', 'ecohotelsamawe').canActivate()).resolves.toBe(true);
  });

  it('bloquea a cualquier otra organización (admin del hotel 2 o super admin "dentro")', async () => {
    await expect(build('g-hotel2', 'hotel2').canActivate()).rejects.toThrow(ConflictException);
  });

  it('sin organización resuelta también bloquea', async () => {
    await expect(build(undefined, null).canActivate()).rejects.toThrow(ConflictException);
  });
});
