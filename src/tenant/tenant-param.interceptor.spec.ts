import { Body, Controller, Get, INestApplication, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { IsOptional, IsString } from 'class-validator';
import { TenantContext } from './tenant-context.service';
import { TenantParamInterceptor } from './tenant-param.interceptor';

/**
 * Con sesión, el `organizationalId` que manda el cliente se reemplaza por el de
 * la sesión. App Nest real (Express 5): `req.query` es un getter y hay que
 * comprobar que el reemplazo llega de verdad al controller.
 */
class ListDto {
  @IsOptional() @IsString() organizationalId?: string;
  @IsOptional() @IsString() search?: string;
}
class CreateDto {
  @IsString() name!: string;
  @IsOptional() @IsString() organizationalId?: string;
}

const SESSION_ORG = 'org-sesion';

/** Simula AuthGuard: pone un usuario solo si llega la cabecera. */
class FakeAuthGuard {
  canActivate(ctx: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } } }) {
    const req = ctx.switchToHttp().getRequest();
    if (req.headers['x-test-user']) req.user = { userId: 'u1' };
    return true;
  }
}

@Controller()
@UseGuards(FakeAuthGuard)
class ProbeController {
  @Get('list')
  list(@Query() q: ListDto) {
    return q;
  }
  @Post('create')
  create(@Body() b: CreateDto) {
    return b;
  }
  @Post('many')
  many(@Body() b: { details: { organizationalId?: string }[] }) {
    return b;
  }
}

describe('TenantParamInterceptor (app Nest real)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            setup: (cls) => cls.set('tenant', { organizationalId: SESSION_ORG, hostname: 'h', kind: 'web' }),
          },
        }),
      ],
      controllers: [ProbeController],
      providers: [TenantContext, { provide: APP_INTERCEPTOR, useClass: TenantParamInterceptor }],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app?.close());

  it('con sesión, la query de otra organización se reemplaza', async () => {
    const res = await request(app.getHttpServer())
      .get('/list?organizationalId=org-ajena&search=x')
      .set('x-test-user', '1');
    expect(res.body).toEqual({ organizationalId: SESSION_ORG, search: 'x' });
  });

  it('con sesión, el body de otra organización se reemplaza', async () => {
    const res = await request(app.getHttpServer())
      .post('/create')
      .set('x-test-user', '1')
      .send({ name: 'p', organizationalId: 'org-ajena' });
    expect(res.body).toEqual({ name: 'p', organizationalId: SESSION_ORG });
  });

  it('también en los elementos de un arreglo del body', async () => {
    const res = await request(app.getHttpServer())
      .post('/many')
      .set('x-test-user', '1')
      .send({ details: [{ organizationalId: 'a' }, { organizationalId: 'b' }, {}] });
    expect(res.body.details).toEqual([
      { organizationalId: SESSION_ORG },
      { organizationalId: SESSION_ORG },
      {},
    ]);
  });

  it('si el campo no viene, no se agrega (no rompe la validación)', async () => {
    const res = await request(app.getHttpServer())
      .post('/create')
      .set('x-test-user', '1')
      .send({ name: 'p' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'p' });
  });

  it('sin sesión (sitio público) no se toca', async () => {
    const res = await request(app.getHttpServer()).get('/list?organizationalId=org-x');
    expect(res.body).toEqual({ organizationalId: 'org-x' });
  });
});
