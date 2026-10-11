import { ConflictException, NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OrganizationalController } from './organizational.controller';
import { Organizational } from '../../shared/entities/organizational.entity';
import { User } from '../../shared/entities/user.entity';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

/**
 * H1 (auditoría multi-hotel, 10 oct 2026): `GET /organizational/slug/:slug` era
 * público y devolvía la entidad entera, con `googleBusinessRefreshToken`, la
 * configuración de Factus y el id del representante legal. `GET :id` también
 * era público y traía los datos personales del representante.
 */
describe('OrganizationalController — exposición pública', () => {
  const SECRET = 'refresh-token-que-nunca-debe-salir';

  const buildOrg = (): Organizational => {
    const rep = Object.assign(new User(), {
      userId: 'rep-1',
      identificationNumber: '12345678',
      email: 'propietario@example.com',
      phone: '3000000000',
    });
    return Object.assign(new Organizational(), {
      organizationalId: 'org-1',
      name: 'Hotel Uno',
      legalName: 'Hotel Uno S.A.S.',
      slug: 'hotel-uno',
      identificationNumber: '900000001',
      phone: '3111111111',
      primaryColor: '#123456',
      googleBusinessRefreshToken: SECRET,
      googleBusinessAccountName: 'accounts/1',
      googleBusinessLocationName: 'locations/1',
      factusNumberingRangeId: 10,
      factusNumberingRangeIdCreditNote: 11,
      factusDv: '7',
      legalRepresentativeUserId: 'rep-1',
      legalRepresentative: rep,
      paymentEnabled: true,
      medias: [],
    });
  };

  const build = (org: Organizational, tenantOrgId?: string) =>
    new OrganizationalController(
      {
        findBySlug: jest.fn(async () => org),
        findOne: jest.fn(async () => org),
        findPublicById: jest.fn(async () => org),
        update: jest.fn(async () => undefined),
        delete: jest.fn(async () => undefined),
      } as never,
      {} as never,
      {
        organizationalId: tenantOrgId,
        requireOrganizationalId: () => {
          if (!tenantOrgId) throw new Error('sin hotel');
          return tenantOrgId;
        },
      } as never,
    );

  const asUser = (code: string, organizationalId: string | null) => ({
    user: { roleType: { code }, organizationalId },
  });

  /** Lo mismo que hace `ClassSerializerInterceptor` antes de responder. */
  const serialize = (body: unknown) => JSON.stringify(instanceToPlain(body));

  it('slug/:slug no expone el refresh token ni la configuración interna', async () => {
    const body = serialize(await build(buildOrg()).findBySlug('hotel-uno'));

    expect(body).not.toContain(SECRET);
    for (const key of [
      'googleBusinessRefreshToken',
      'googleBusinessAccountName',
      'googleBusinessLocationName',
      'factusNumberingRangeId',
      'factusDv',
      'legalRepresentative',
      'legalRepresentativeUserId',
      'paymentEnabled',
    ]) {
      expect(body).not.toContain(`"${key}"`);
    }
  });

  it('slug/:slug conserva lo que usan la web y el PDF de la factura', async () => {
    const { data } = await build(buildOrg()).findBySlug('hotel-uno');
    expect(data).toMatchObject({
      organizationalId: 'org-1',
      name: 'Hotel Uno',
      legalName: 'Hotel Uno S.A.S.',
      identificationNumber: '900000001',
      phone: '3111111111',
      primaryColor: '#123456',
    });
  });

  it('current usa la misma lista blanca que slug', async () => {
    const body = serialize(await build(buildOrg(), 'org-1').findCurrent());
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('"factusNumberingRangeId"');
    expect(body).toContain('"organizationalId":"org-1"');
  });

  it('current sin hotel resuelto falla (nunca elige uno)', async () => {
    await expect(build(buildOrg()).findCurrent()).rejects.toThrow('sin hotel');
  });

  it(':id (staff) no serializa el refresh token aunque devuelva la entidad', async () => {
    const body = serialize(
      await build(buildOrg()).findOne('org-1', asUser('ADMIN', 'org-1')),
    );
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('"googleBusinessRefreshToken"');
  });

  describe('guards y roles', () => {
    const proto = OrganizationalController.prototype as unknown as Record<
      string,
      object
    >;
    const guardsOf = (m: string) =>
      Reflect.getMetadata(GUARDS_METADATA, proto[m]) as unknown[] | undefined;
    const rolesOf = (m: string) =>
      Reflect.getMetadata(ROLES_KEY, proto[m]) as RolesUser[] | undefined;

    it(':id exige sesión', () => {
      expect(guardsOf('findOne')?.length).toBeGreaterThan(0);
    });

    it('slug/:slug y current siguen siendo públicos', () => {
      expect(guardsOf('findBySlug')).toBeUndefined();
      expect(guardsOf('findCurrent')).toBeUndefined();
    });

    it('update: SUPERADMIN, ADMIN y PLATFORM_ADMIN (no EMP)', () => {
      expect(guardsOf('update')?.length).toBeGreaterThan(0);
      expect(rolesOf('update')).toEqual([
        RolesUser.SUPERADMIN,
        RolesUser.ADMIN,
        RolesUser.PLATFORM_ADMIN,
      ]);
    });

    it.each([
      'addMedia',
      'uploadMedia',
      'updateMedia',
      'deleteMedia',
      'createCorporateValue',
      'updateCorporateValue',
      'deleteCorporateValue',
      'uploadCorporateValueImage',
      'deleteCorporateValueImage',
    ])('%s no lo puede usar EMP', (method) => {
      expect(guardsOf(method)?.length).toBeGreaterThan(0);
      expect(rolesOf(method)).toEqual([RolesUser.SUPERADMIN, RolesUser.ADMIN]);
    });

    it.each(['create', 'delete', 'findAll'])(
      '%s es solo de plataforma (SUPERADMIN / PLATFORM_ADMIN)',
      (m) => {
        expect(guardsOf(m)?.length).toBeGreaterThan(0);
        expect(rolesOf(m)).toEqual([RolesUser.SUPERADMIN, RolesUser.PLATFORM_ADMIN]);
      },
    );
  });

  describe('propiedad y autoprotección', () => {
    it('un ADMIN no ve otra organización (404, no 403)', async () => {
      await expect(
        build(buildOrg()).findOne('org-2', asUser('ADMIN', 'org-1')),
      ).rejects.toThrow(NotFoundException);
    });

    it('un ADMIN no edita otra organización', async () => {
      await expect(
        build(buildOrg()).update('org-2', {} as never, asUser('ADMIN', 'org-1')),
      ).rejects.toThrow(NotFoundException);
    });

    it('SUPERADMIN ve y edita cualquiera', async () => {
      const c = build(buildOrg(), 'org-1');
      await expect(c.findOne('org-2', asUser('SUPERADMIN', 'org-1'))).resolves.toBeDefined();
      await expect(
        c.update('org-2', { status: false } as never, asUser('SUPERADMIN', 'org-1')),
      ).resolves.toBeDefined();
    });

    it('no se desactiva la organización del sitio en uso', async () => {
      await expect(
        build(buildOrg(), 'org-1').update(
          'org-1',
          { status: false } as never,
          asUser('SUPERADMIN', 'org-1'),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('no se elimina la organización del sitio en uso', async () => {
      await expect(
        build(buildOrg(), 'org-1').delete('org-1', asUser('SUPERADMIN', 'org-1')),
      ).rejects.toThrow(ConflictException);
    });

    it('estando "dentro" de otra, tampoco se desactiva ni elimina la propia', async () => {
      // Super admin de org-1 operando en org-2 (selector).
      const req = {
        user: {
          roleType: { code: 'SUPERADMIN' },
          organizationalId: 'org-2',
          homeOrganizationalId: 'org-1',
        },
      };
      const c = build(buildOrg(), 'org-2');
      await expect(c.update('org-1', { status: false } as never, req)).rejects.toThrow(
        ConflictException,
      );
      await expect(c.delete('org-1', req)).rejects.toThrow(ConflictException);
    });
  });
});
