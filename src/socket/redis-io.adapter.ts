import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { REDIS_CLIENT, RedisOrNull } from '../redis/redis.module';

/**
 * Adaptador de Socket.IO respaldado por Redis.
 *
 * ### Por qué hace falta
 *
 * Socket.IO guarda en memoria qué sockets tiene conectados **esta** instancia.
 * Con dos backends detrás de un balanceador, el mesero se conecta a la A y el
 * chef a la B: cuando la A emite "nueva comanda", el chef **no la recibe**,
 * porque la A no sabe que existe. El adaptador de Redis hace que las dos
 * instancias se publiquen los eventos entre sí (pub/sub).
 *
 * De las cuatro piezas de estado en memoria, esta es la que rompe algo
 * visible para el usuario en cuanto se escala.
 *
 * ### Sin Redis
 *
 * `connect()` no hace nada y el adaptador se comporta como el de siempre: un
 * único proceso, todo en memoria. Es el comportamiento anterior.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connect(): Promise<void> {
    const client = this.app.get<RedisOrNull>(REDIS_CLIENT, { strict: false });
    if (!client) {
      this.logger.warn(
        'Socket.IO sin adaptador de Redis: los eventos solo llegan a los ' +
          'clientes de esta instancia. Válido con UNA sola.',
      );
      return;
    }

    // El cliente suscriptor tiene que ser uno APARTE: una conexión en modo
    // subscribe no admite comandos normales, así que reutilizar el principal
    // dejaría sin funcionar el token de Factus y los locks.
    const pubClient = client.duplicate();
    const subClient = client.duplicate();

    pubClient.on('error', (err) =>
      this.logger.error(`Socket.IO pub: ${err.message}`),
    );
    subClient.on('error', (err) =>
      this.logger.error(`Socket.IO sub: ${err.message}`),
    );

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.IO usando el adaptador de Redis.');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
