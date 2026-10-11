import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import request from 'supertest';
import { isTenantlessPath, normalizeHost, ResolvedTenant } from './tenant.types';
import { TenantResolverService } from './tenant-resolver.service';
import { resolveTenantForRequest, UNKNOWN_HOST_STATUS } from './tenant.module';
import { TenantContext } from './tenant-context.service';
import { checkSessionTenant, tokenOrgIdFor } from './session-tenant';

/**
 * Multi-hotel, fase 1: el hotel sale del host. Un host desconocido NUNCA cae en
 * "la primera organización": se rechaza.
 */
describe('normalizeHost', () => {
  it.each([
    ['API.EcoHotelSamawe.com', 'api.ecohotelsamawe.com'],
    ['ecohotelsamawe.com:443', 'ecohotelsamawe.com'],
    ['www.ecohotelsamawe.com', 'ecohotelsamawe.com'],
    ['ecohotelsamawe.com.', 'ecohotelsamawe.com'],
    ['  localhost:3000 ', 'localhost'],
    ['hotel2.com, proxy.interno', 'hotel2.com'],
    ['[::1]:3000', '[::1]'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeHost(raw)).toBe(expected);
  });

  it.each([undefined, null, '', 'a b.com', 'evil.com/x', 'user@evil.com'])(
    'rechaza %p',
    (raw) => {
      expect(normalizeHost(raw as never)).toBeNull();
    },
  );
});

describe('isTenantlessPath', () => {
  it.each(['/', '/health', '/docs', '/docs-json', '/uploads/products/a.webp', '/socket.io/?EIO=4'])(
    '%s no exige hotel',
    (p) => expect(isTenantlessPath(p)).toBe(true),
  );
  it.each(['/invoice/1', '/organizational/current', '/uploadsX', '/app/related-data'])(
    '%s sí exige hotel',
    (p) => expect(isTenantlessPath(p)).toBe(false),
  );
});

describe('TenantResolverService', () => {
  const org = { organizationalId: 'org-1', status: true };
  const build = (rows: Record<string, unknown>) => {
    const findOne = jest.fn(async ({ where }: { where: { hostname: string } }) =>
      rows[where.hostname] ?? null,
    );
    return { resolver: new TenantResolverService({ findOne } as never), findOne };
  };

  it('resuelve un host activo, normalizado', async () => {
    const { resolver } = build({
      'api.ecohotelsamawe.com': { organizationalId: 'org-1', kind: 'api', organizational: org },
    });
    await expect(resolver.resolve('API.ecohotelsamawe.com:443')).resolves.toEqual({
      organizationalId: 'org-1',
      hostname: 'api.ecohotelsamawe.com',
      kind: 'api',
    });
  });

  it('host desconocido → null (nunca un hotel por defecto)', async () => {
    const { resolver } = build({});
    await expect(resolver.resolve('desconocido.com')).resolves.toBeNull();
  });

  it('busca solo dominios activos', async () => {
    const { resolver, findOne } = build({});
    await resolver.resolve('hotel.com');
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hostname: 'hotel.com', status: 'active' } }),
    );
  });

  it('un hotel desactivado no resuelve', async () => {
    const { resolver } = build({
      'hotel.com': {
        organizationalId: 'org-2',
        kind: 'web',
        organizational: { organizationalId: 'org-2', status: false },
      },
    });
    await expect(resolver.resolve('hotel.com')).resolves.toBeNull();
  });

  it('cachea aciertos y fallos; invalidate() vuelve a consultar', async () => {
    const { resolver, findOne } = build({
      'hotel.com': { organizationalId: 'org-2', kind: 'web', organizational: org },
    });
    await resolver.resolve('hotel.com');
    await resolver.resolve('hotel.com');
    await resolver.resolve('nadie.com');
    await resolver.resolve('nadie.com');
    expect(findOne).toHaveBeenCalledTimes(2);
    resolver.invalidate();
    await resolver.resolve('hotel.com');
    expect(findOne).toHaveBeenCalledTimes(3);
  });
});

describe('Middleware de hotel (app Nest real)', () => {
  const tenants: Record<string, ResolvedTenant> = {
    'api.hotel-a.com': { organizationalId: 'org-a', hostname: 'api.hotel-a.com', kind: 'api' },
    'api.hotel-b.com': { organizationalId: 'org-b', hostname: 'api.hotel-b.com', kind: 'api' },
  };
  const fakeResolver = {
    resolve: async (h: string) => tenants[normalizeHost(h) ?? ''] ?? null,
  } as unknown as TenantResolverService;

  @Controller()
  class ProbeController {
    constructor(private readonly tenant: TenantContext) {}
    @Get('health')
    health() {
      return { ok: true, org: this.tenant.organizationalId ?? null };
    }
    @Get('datos')
    datos() {
      return { org: this.tenant.requireOrganizationalId() };
    }
  }

  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            setup: (cls, req) =>
              resolveTenantForRequest(fakeResolver, cls as never, req as never),
          },
        }),
      ],
      controllers: [ProbeController],
      providers: [TenantContext],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => app?.close());

  it('cada host ve SU hotel', async () => {
    const a = await request(app.getHttpServer()).get('/datos').set('Host', 'api.hotel-a.com');
    const b = await request(app.getHttpServer()).get('/datos').set('Host', 'api.hotel-b.com');
    expect(a.body).toEqual({ org: 'org-a' });
    expect(b.body).toEqual({ org: 'org-b' });
  });

  it(`host desconocido → ${UNKNOWN_HOST_STATUS}, sin llegar al controller`, async () => {
    const res = await request(app.getHttpServer()).get('/datos').set('Host', 'otro.com');
    expect(res.status).toBe(UNKNOWN_HOST_STATUS);
    expect(res.body.statusCode).toBe(UNKNOWN_HOST_STATUS);
  });

  it('/health responde aunque el host sea desconocido, y sin hotel', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('Host', 'otro.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, org: null });
  });

  it('el contexto no se filtra entre peticiones concurrentes', async () => {
    const reqs = Array.from({ length: 20 }, (_, i) =>
      request(app.getHttpServer())
        .get('/datos')
        .set('Host', i % 2 ? 'api.hotel-a.com' : 'api.hotel-b.com')
        .then((r) => [i % 2 ? 'org-a' : 'org-b', r.body.org]),
    );
    for (const [expected, got] of await Promise.all(reqs)) {
      expect(got).toBe(expected);
    }
  });

  it('TenantContext.runAs fija el hotel fuera de una petición (crons)', async () => {
    const ctx = app.get(TenantContext);
    expect(ctx.organizationalId).toBeUndefined();
    await expect(ctx.runAs('org-b', async () => ctx.organizationalId)).resolves.toBe('org-b');
    expect(ctx.organizationalId).toBeUndefined();
    expect(app.get(ClsService).isActive()).toBe(false);
  });
});

describe('checkSessionTenant', () => {
  const tenantA: ResolvedTenant = { organizationalId: 'org-a', hostname: 'a.com', kind: 'web' };
  const userA = { organizationalId: 'org-a', roleType: { code: 'ADMIN' } };
  const userB = { organizationalId: 'org-b', roleType: { code: 'ADMIN' } };
  const platform = { organizationalId: null, roleType: { code: 'PLATFORM_ADMIN' } };

  it('usuario y token del hotel → ok', () => {
    expect(checkSessionTenant(userA, 'org-a', tenantA)).toEqual({ ok: true });
  });

  it('token viejo sin orgId → ok si el usuario es del hotel', () => {
    expect(checkSessionTenant(userA, undefined, tenantA)).toEqual({ ok: true });
  });

  it('usuario de otro hotel → rechazado', () => {
    expect(checkSessionTenant(userB, undefined, tenantA)).toMatchObject({
      ok: false,
      reason: 'user-other-org',
    });
  });

  it('token de otro hotel → rechazado aunque el usuario coincida', () => {
    expect(checkSessionTenant(userA, 'org-b', tenantA)).toMatchObject({
      ok: false,
      reason: 'token-other-org',
    });
  });

  it('sin hotel resuelto → rechazado', () => {
    expect(checkSessionTenant(userA, 'org-a', undefined)).toMatchObject({
      ok: false,
      reason: 'no-tenant',
    });
  });

  it('usuario sin organización (y no de plataforma) → rechazado', () => {
    expect(
      checkSessionTenant({ organizationalId: null, roleType: { code: 'USER' } }, undefined, tenantA),
    ).toMatchObject({ ok: false, reason: 'user-without-org' });
  });

  it('PLATFORM_ADMIN vale en cualquier hotel resuelto, pero no sin hotel', () => {
    expect(checkSessionTenant(platform, null, tenantA)).toEqual({ ok: true });
    expect(checkSessionTenant(platform, null, undefined)).toMatchObject({ ok: false });
  });

  it('el token lleva la organización del usuario; null para plataforma', () => {
    expect(tokenOrgIdFor(userA)).toBe('org-a');
    expect(tokenOrgIdFor({ organizational: { organizationalId: 'org-x' } })).toBe('org-x');
    expect(tokenOrgIdFor(platform)).toBeNull();
  });
});
