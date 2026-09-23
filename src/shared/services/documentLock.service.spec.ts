import { DocumentLockService } from './documentLock.service';

/**
 * El lock distribuido de emisión.
 *
 * Lo que se fija aquí es lo que NO se puede comprobar con el lock en memoria:
 * que **dos instancias distintas** del backend no emitan a la vez sobre la
 * misma factura. Una factura duplicada ante la DIAN no se puede borrar — es el
 * incidente A773.
 *
 * Cada `DocumentLockService` de estos tests representa una instancia: tienen su
 * propio `Map` local pero comparten el mismo Redis, igual que en producción.
 *
 * ⚠️ El doble de Redis implementa solo lo que usa el servicio (`SET NX PX` y el
 * `EVAL` de liberación), pero con la MISMA semántica: `NX` solo escribe si la
 * clave no existe, y el script borra únicamente si el valor coincide. Si esas
 * dos cosas se rompieran, estos tests lo verían.
 */
class FakeRedis {
  private readonly store = new Map<string, string>();
  failNext = false;

  async set(
    key: string,
    value: string,
    _px: 'PX',
    _ttl: number,
    _nx: 'NX',
  ): Promise<'OK' | null> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('Redis caído');
    }
    if (this.store.has(key)) return null;
    this.store.set(key, value);
    return 'OK';
  }

  async eval(
    _script: string,
    _numKeys: number,
    key: string,
    token: string,
  ): Promise<number> {
    if (this.store.get(key) === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  /** Solo para los asertos: qué locks quedaron colgando. */
  get keys(): string[] {
    return [...this.store.keys()];
  }
}

const build = (redis: FakeRedis | null) =>
  new DocumentLockService(redis as never);

describe('DocumentLockService — lock distribuido', () => {
  it('dos instancias distintas NO entran a la vez en la misma factura', async () => {
    const redis = new FakeRedis();
    const a = build(redis);
    const b = build(redis);

    let concurrentes = 0;
    let maxConcurrentes = 0;

    const trabajo = async () => {
      concurrentes++;
      maxConcurrentes = Math.max(maxConcurrentes, concurrentes);
      await new Promise((r) => setTimeout(r, 30));
      concurrentes--;
    };

    await Promise.all([
      a.withLock('invoice', 9, trabajo),
      b.withLock('invoice', 9, trabajo),
    ]);

    expect(maxConcurrentes).toBe(1);
  });

  it('facturas distintas no se bloquean entre instancias', async () => {
    const redis = new FakeRedis();
    const a = build(redis);
    const b = build(redis);

    let concurrentes = 0;
    let maxConcurrentes = 0;

    const trabajo = async () => {
      concurrentes++;
      maxConcurrentes = Math.max(maxConcurrentes, concurrentes);
      await new Promise((r) => setTimeout(r, 30));
      concurrentes--;
    };

    await Promise.all([
      a.withLock('invoice', 1, trabajo),
      b.withLock('invoice', 2, trabajo),
    ]);

    // Si se bloquearan entre sí, el máximo sería 1 y el lock estaría de más.
    expect(maxConcurrentes).toBe(2);
  });

  it('libera el lock aunque la operación falle', async () => {
    const redis = new FakeRedis();
    const a = build(redis);

    await expect(
      a.withLock('invoice', 9, async () => {
        throw new Error('la emisión falló');
      }),
    ).rejects.toThrow('la emisión falló');

    // Sin liberación, esa factura quedaría bloqueada hasta que venciera el TTL.
    expect(redis.keys).toHaveLength(0);

    // Y la siguiente petición tiene que poder entrar.
    await expect(a.withLock('invoice', 9, async () => 'ok')).resolves.toBe('ok');
  });

  it('una instancia no borra el lock de otra', async () => {
    const redis = new FakeRedis();
    const a = build(redis);
    const b = build(redis);

    // A toma el lock "a mano" y no lo suelta.
    await redis.set('samawe:lock:invoice:9', 'token-de-A', 'PX', 1000, 'NX');

    // B intenta liberar con su propio token: no debe borrar el de A.
    await redis.eval('script', 1, 'samawe:lock:invoice:9', 'token-de-B');
    expect(redis.keys).toContain('samawe:lock:invoice:9');

    // Con el token correcto sí.
    await redis.eval('script', 1, 'samawe:lock:invoice:9', 'token-de-A');
    expect(redis.keys).toHaveLength(0);

    expect(a.isDistributed && b.isDistributed).toBe(true);
  });

  it('si Redis falla, sigue adelante con el lock local en vez de tumbar la emisión', async () => {
    const redis = new FakeRedis();
    redis.failNext = true;
    const a = build(redis);

    // Una caída de Redis NO puede impedir facturar: se degrada a "una
    // instancia", que es el comportamiento anterior.
    await expect(a.withLock('invoice', 9, async () => 'emitida')).resolves.toBe(
      'emitida',
    );
  });

  it('sin Redis encola dentro de la instancia, igual que antes', async () => {
    const a = build(null);
    expect(a.isDistributed).toBe(false);

    const orden: number[] = [];
    await Promise.all([
      a.withLock('invoice', 9, async () => {
        await new Promise((r) => setTimeout(r, 20));
        orden.push(1);
      }),
      a.withLock('invoice', 9, async () => {
        orden.push(2);
      }),
    ]);

    expect(orden).toEqual([1, 2]);
  });
});
