import { Global, HttpException, Logger, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantParamInterceptor } from './tenant-param.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { Request } from 'express';
import { OrganizationDomain } from '../shared/entities/organizationDomain.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantContext } from './tenant-context.service';
import { isTenantlessPath, TenantClsStore } from './tenant.types';

/** 421 Misdirected Request: este servidor no atiende ese host. */
export const UNKNOWN_HOST_STATUS = 421;

const logger = new Logger('TenantMiddleware');

/**
 * Hotel por host, para TODA petición HTTP.
 *
 * Se resuelve dentro del propio middleware de `nestjs-cls` (`setup`), así no
 * depende del orden en que Nest monte middlewares de distintos módulos: cuando
 * llega a guards, estrategias de Passport y controllers, el hotel ya está en el
 * contexto.
 *
 * El host sale de `req.hostname`, que Express toma de `X-Forwarded-Host` solo
 * porque `main.ts` confía en UN proxy (`trust proxy = 1`, Traefik). Una petición
 * directa al contenedor usa su `Host` real.
 */
async function resolveTenantForRequest(
  resolver: TenantResolverService,
  cls: { set: (k: 'tenant', v: unknown) => void },
  req: Request,
): Promise<void> {
  const path = (req.originalUrl || req.url || '/').split('?')[0];
  const tenant = await resolver.resolve(req.hostname);
  if (tenant) {
    cls.set('tenant', tenant);
    return;
  }
  if (isTenantlessPath(path)) return;

  logger.warn(`Host desconocido rechazado: "${req.hostname}" ${req.method} ${path}`);
  throw new HttpException(
    {
      statusCode: UNKNOWN_HOST_STATUS,
      message: 'Este dominio no está configurado en el servidor.',
    },
    UNKNOWN_HOST_STATUS,
  );
}

/**
 * El resolver va en su propio módulo porque `ClsModule.forRootAsync` lo
 * necesita ya construido para armar el middleware.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationDomain])],
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenantResolverModule {}

@Global()
@Module({
  imports: [
    TenantResolverModule,
    ClsModule.forRootAsync({
      global: true,
      imports: [TenantResolverModule],
      inject: [TenantResolverService],
      useFactory: (resolver: TenantResolverService) => ({
        middleware: {
          mount: true,
          setup: (cls, req: Request) =>
            resolveTenantForRequest(resolver, cls as never, req),
        },
      }),
    }),
  ],
  providers: [
    TenantContext,
    // Con sesión, el `organizationalId` del cliente se reemplaza por el de la
    // sesión (ver el interceptor).
    { provide: APP_INTERCEPTOR, useClass: TenantParamInterceptor },
  ],
  exports: [TenantContext, TenantResolverModule],
})
export class TenantModule {}

export { resolveTenantForRequest };
export type { TenantClsStore };
