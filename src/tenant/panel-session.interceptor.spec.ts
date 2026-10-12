import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { lastValueFrom, of } from 'rxjs';
import { PanelSessionInterceptor } from './panel-session.interceptor';

/**
 * Host del panel: una ruta PÚBLICA con token válido opera en el hotel del
 * token; sin token, con token inválido o fuera del panel, en el del host.
 */
const SECRET = 'secreto-de-prueba';
const SAMAWE = 'org-samawe';
const CRAZY = 'org-crazy';
const sign = (payload: object, secret = SECRET) => new JwtService({}).sign(payload, { secret });

function setup(isPanel: boolean) {
  const state = { org: SAMAWE, isPanel };
  const tenant = {
    get tenant() {
      return { organizationalId: state.org, hostname: 'h', kind: 'api', isPanel: state.isPanel };
    },
    get organizationalId() {
      return state.org;
    },
    actAs: (id: string) => (state.org = id),
  };
  const config = { get: () => SECRET } as unknown as ConfigService;
  const interceptor = new PanelSessionInterceptor(tenant as never, config);
  const run = (req: object) =>
    lastValueFrom(
      interceptor.intercept(
        { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) } as never,
        { handle: () => of('ok') },
      ),
    ).then(() => state.org);
  return { run };
}

describe('PanelSessionInterceptor', () => {
  it('panel + token válido con orgId -> el hotel del token', async () => {
    const { run } = setup(true);
    await expect(run({ headers: { authorization: `Bearer ${sign({ orgId: CRAZY })}` } })).resolves.toBe(CRAZY);
  });

  it('panel sin token -> el host', async () => {
    await expect(setup(true).run({ headers: {} })).resolves.toBe(SAMAWE);
  });

  it('token firmado con otro secreto -> se ignora', async () => {
    const { run } = setup(true);
    await expect(run({ headers: { authorization: `Bearer ${sign({ orgId: CRAZY }, 'otro')}` } })).resolves.toBe(SAMAWE);
  });

  it('fuera del panel (API de un hotel) -> el host aunque haya token', async () => {
    const { run } = setup(false);
    await expect(run({ headers: { authorization: `Bearer ${sign({ orgId: CRAZY })}` } })).resolves.toBe(SAMAWE);
  });

  it('ruta con guard (ya hay req.user) -> no toca nada', async () => {
    const { run } = setup(true);
    await expect(run({ user: { userId: 'u' }, headers: { authorization: `Bearer ${sign({ orgId: CRAZY })}` } })).resolves.toBe(SAMAWE);
  });

  it('token sin orgId (administrador de plataforma) -> el host', async () => {
    const { run } = setup(true);
    await expect(run({ headers: { authorization: `Bearer ${sign({ sub: 'x' })}` } })).resolves.toBe(SAMAWE);
  });
});
