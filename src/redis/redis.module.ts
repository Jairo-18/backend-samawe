import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';

/** Token de inyección del cliente Redis. Es `null` si no hay `REDIS_URL`. */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Cliente Redis, o `null` cuando la aplicación corre sin Redis. */
export type RedisOrNull = Redis | null;

/**
 * Crea el cliente Redis a partir de `REDIS_URL`.
 *
 * ⚠️ **Si no hay `REDIS_URL`, devuelve `null` y la aplicación arranca igual.**
 * Todo lo que usa Redis —token de Factus, locks de emisión, adaptador de
 * Socket.IO y throttler— tiene su equivalente en memoria, que es exactamente el
 * comportamiento que había antes. Eso permite:
 *
 *  - seguir levantando el backend en local sin montar nada,
 *  - desplegar este cambio ANTES de que Redis exista en el VPS, sin romper,
 *  - y que una caída de Redis degrade a "una sola instancia" en vez de tumbar
 *    la aplicación entera.
 *
 * `lazyConnect: false` a propósito: interesa enterarse del fallo al arrancar y
 * no en mitad de una emisión.
 */
export function createRedisClient(
  url: string | undefined,
  logger: Logger,
): RedisOrNull {
  if (!url) {
    logger.warn(
      'REDIS_URL no está definida: se usan los almacenes en memoria. ' +
        'Válido con UNA sola instancia del backend.',
    );
    return null;
  }

  const client = new Redis(url, {
    // Sin tope de reintentos el cliente se queda colgado para siempre en un
    // comando si Redis no vuelve; con tope, el comando falla y cada consumidor
    // decide si degrada a memoria o propaga el error.
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });

  client.on('error', (err) => {
    // Sin este handler, un error de conexión de ioredis se convierte en un
    // `unhandledRejection` y tumba el proceso.
    logger.error(`Redis: ${err.message}`);
  });
  client.on('ready', () => logger.log('Redis conectado.'));

  return client;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisOrNull =>
        createRedisClient(
          configService.get<string>('REDIS_URL'),
          new Logger('Redis'),
        ),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Cierra la conexión al apagar. Sin esto, un redeploy deja sockets colgando
   * en Redis hasta que vencen por timeout.
   */
  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<RedisOrNull>(REDIS_CLIENT, {
      strict: false,
    });
    if (!client) return;
    try {
      await client.quit();
      this.logger.log('Redis desconectado.');
    } catch {
      client.disconnect();
    }
  }
}
