import { ForbiddenException } from '@nestjs/common';
import { GoogleBusinessService } from './google-business.service';
import {
  createSignedState,
  verifySignedState,
} from '../../shared/utils/signed-state';

/**
 * H3 (auditoría multi-hotel, 10 oct 2026): el callback de Google Business
 * aceptaba `state = organizationalId` en claro, sin sesión. Se podía vincular
 * una cuenta de Google ajena a cualquier organización.
 */
describe('signed-state', () => {
  const SECRET = 'secreto-de-prueba';
  const P = 'google-business-oauth';
  const data = { organizationalId: 'org-1', userId: 'user-1' };

  it('acepta un state válido y devuelve sus datos', () => {
    const state = createSignedState(data, SECRET, P, 60_000);
    expect(verifySignedState(state, SECRET, P)).toMatchObject({
      o: 'org-1',
      u: 'user-1',
    });
  });

  it('rechaza un id de organización en claro (el formato viejo)', () => {
    expect(verifySignedState('org-1', SECRET, P)).toBeNull();
  });

  it('rechaza un state vencido', () => {
    const state = createSignedState(data, SECRET, P, 1_000, 0);
    expect(verifySignedState(state, SECRET, P, 5_000)).toBeNull();
  });

  it('rechaza un payload alterado (otra organización con la firma vieja)', () => {
    const state = createSignedState(data, SECRET, P, 60_000);
    const [, mac] = state.split('.');
    const forged = Buffer.from(
      JSON.stringify({ o: 'org-2', u: 'user-1', exp: Date.now() + 60_000, n: 'x' }),
    ).toString('base64url');
    expect(verifySignedState(`${forged}.${mac}`, SECRET, P)).toBeNull();
  });

  it('rechaza un state firmado con otro secreto o para otro propósito', () => {
    const state = createSignedState(data, SECRET, P, 60_000);
    expect(verifySignedState(state, 'otro-secreto', P)).toBeNull();
    expect(verifySignedState(state, SECRET, 'otro-flujo')).toBeNull();
  });
});

describe('GoogleBusinessService — state firmado', () => {
  const SECRET = 'jwt-secret-de-prueba';

  const build = (user: unknown) => {
    const orgRepo = { update: jest.fn(), findOne: jest.fn() };
    const userRepo = { findOne: jest.fn(async () => user) };
    const config = {
      get: jest.fn((k: string) =>
        k === 'jwt.secret' ? SECRET : `valor-de-${k}`,
      ),
    };
    const service = new GoogleBusinessService(
      orgRepo as never,
      config as never,
      userRepo as never,
    );
    return { service, orgRepo, userRepo };
  };

  const staffOf = (orgId: string, code = 'ADMIN') => ({
    userId: 'user-1',
    roleType: { code },
    organizational: { organizationalId: orgId },
  });

  const stateFrom = (url: string) =>
    new URL(url).searchParams.get('state') as string;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      json: async () => ({ refresh_token: 'rt' }),
    })) as never;
  });

  it('no genera enlace para una organización ajena', () => {
    const { service } = build(null);
    expect(() =>
      service.getOAuthUrl('org-2', { userId: 'user-1', organizationalId: 'org-1' }),
    ).toThrow(ForbiddenException);
  });

  it('no genera enlace si el usuario no tiene organización', () => {
    const { service } = build(null);
    expect(() =>
      service.getOAuthUrl('org-1', { userId: 'user-1', organizationalId: null }),
    ).toThrow(ForbiddenException);
  });

  it('el state del enlace no es el id en claro', () => {
    const { service } = build(null);
    const url = service.getOAuthUrl('org-1', {
      userId: 'user-1',
      organizationalId: 'org-1',
    });
    expect(stateFrom(url)).not.toBe('org-1');
  });

  it('vincula la cuenta con un state propio y vigente', async () => {
    const { service, orgRepo } = build(staffOf('org-1'));
    const url = service.getOAuthUrl('org-1', {
      userId: 'user-1',
      organizationalId: 'org-1',
    });
    await service.handleCallback('code', stateFrom(url));
    expect(orgRepo.update).toHaveBeenCalledWith('org-1', {
      googleBusinessRefreshToken: 'rt',
    });
  });

  it('rechaza el formato viejo (id en claro) sin llamar a Google', async () => {
    const { service, orgRepo } = build(staffOf('org-1'));
    await expect(service.handleCallback('code', 'org-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(orgRepo.update).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario ya no pertenece a esa organización', async () => {
    const { service, orgRepo } = build(staffOf('org-2'));
    const url = service.getOAuthUrl('org-1', {
      userId: 'user-1',
      organizationalId: 'org-1',
    });
    await expect(
      service.handleCallback('code', stateFrom(url)),
    ).rejects.toThrow(ForbiddenException);
    expect(orgRepo.update).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario ya no es staff', async () => {
    const { service, orgRepo } = build(staffOf('org-1', 'USER'));
    const url = service.getOAuthUrl('org-1', {
      userId: 'user-1',
      organizationalId: 'org-1',
    });
    await expect(
      service.handleCallback('code', stateFrom(url)),
    ).rejects.toThrow(ForbiddenException);
    expect(orgRepo.update).not.toHaveBeenCalled();
  });
});
