import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT, RedisOrNull } from '../../redis/redis.module';

/**
 * Familia del documento que se bloquea. Va en la clave para que una factura y
 * una nota crédito con el mismo `invoiceId` no compitan por el mismo lock…
 * salvo que se quiera justamente eso (ver abajo).
 */
export type DocumentLockScope =
  | 'invoice'
  | 'creditNote'
  | 'debitNote'
  | 'supportDocument'
  | 'adjustmentNote';

/** Tope de espera para adquirir el lock antes de rendirse. */
const ACQUIRE_TIMEOUT_MS = 30_000;

/**
 * TTL del lock en Redis. Es la red de seguridad para el caso feo: si la
 * instancia que lo tiene se muere a mitad de una emisión, el lock se libera
 * solo en vez de dejar esa factura bloqueada para siempre.
 *
 * 2 minutos porque una emisión a Factus es una llamada HTTP que puede tardar
 * varios segundos y el interceptor reintenta ante un 429 con `Retry-After`.
 */
const LOCK_TTL_MS = 120_000;

/** Espera entre intentos de adquisición en Redis. */
const RETRY_DELAY_MS = 150;

/**
 * Serializa operaciones sobre un mismo documento.
 *
 * ### Por qué existe
 *
 * Este lock estaba **copiado y pegado en cinco servicios** (factura, nota
 * crédito, nota débito, documento soporte y nota de ajuste), cada uno con su
 * propio `Map<number, Promise<void>>`. Es lógica sutil y duplicada: si una
 * copia se desincronizaba, ese documento perdía la protección sin que nadie lo
 * notara. El plan de documentos DIAN ya pedía extraerlo antes de migrarlo.
 *
 * ### Qué protege
 *
 * Dos peticiones simultáneas sobre la misma factura —un doble clic en "emitir",
 * o emitir y recuperar a la vez— pasan las dos por los `if` de guarda antes de
 * que ninguna haya guardado, y acaban emitiendo dos veces ante la DIAN. Una
 * factura duplicada ante la DIAN **no se puede borrar**: fue lo que originó el
 * incidente A773.
 *
 * ### Con y sin Redis
 *
 * - **Con `REDIS_URL`**: lock distribuido (`SET NX PX`), válido entre varias
 *   instancias. Se libera con un script Lua que comprueba el dueño, para que
 *   una instancia no borre el lock de otra si el suyo venció por TTL.
 * - **Sin `REDIS_URL`**: cadena de promesas en memoria, exactamente el
 *   comportamiento anterior. Válido con UNA instancia.
 *
 * ⚠️ El lock en memoria se conserva **además** del de Redis y se toma siempre:
 * encola las peticiones de esta misma instancia sin ir a la red, y así el
 * camino normal (dos clics del mismo usuario) no depende de que Redis esté
 * sano.
 */
@Injectable()
export class DocumentLockService {
  private readonly logger = new Logger(DocumentLockService.name);

  /** Cola por clave dentro de esta instancia. */
  private readonly localLocks = new Map<string, Promise<void>>();

  /**
   * Libera el lock SOLO si sigue siendo nuestro. Sin esta comprobación, una
   * instancia cuyo lock venció por TTL borraría al soltar el de la instancia
   * que lo tomó después.
   */
  private static readonly RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisOrNull,
  ) {}

  get isDistributed(): boolean {
    return !!this.redis;
  }

  /**
   * Ejecuta `fn` en exclusiva para `scope` + `id`.
   *
   * Si otra petición tiene el lock, esta **espera** su turno (no falla): el
   * caso de uso es el doble submit, donde la segunda tiene que ver el
   * resultado de la primera y darse cuenta de que ya está emitido.
   */
  async withLock<T>(
    scope: DocumentLockScope,
    id: number | string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const key = `samawe:lock:${scope}:${id}`;

    // 1. Cola local: encola dentro de esta instancia sin tocar la red.
    return this.withLocalLock(key, async () => {
      // 2. Lock distribuido: solo si hay Redis.
      const token = await this.acquireRemote(key);
      try {
        return await fn();
      } finally {
        if (token) await this.releaseRemote(key, token);
      }
    });
  }

  // ── Lock local (cadena de promesas) ────────────────────────────────────────

  private async withLocalLock<T>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.localLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => current);
    this.localLocks.set(key, tail);

    // `catch` para que el fallo de una petición anterior no propague a la
    // siguiente: cada una tiene su propio try/catch.
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      // Solo si nadie se puso en la cola detrás, para no borrar un lock vivo.
      if (this.localLocks.get(key) === tail) {
        this.localLocks.delete(key);
      }
    }
  }

  // ── Lock distribuido (Redis) ───────────────────────────────────────────────

  /** Devuelve el token del lock, o `null` si no hay Redis. */
  private async acquireRemote(key: string): Promise<string | null> {
    if (!this.redis) return null;

    const token = randomUUID();
    const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;

    for (;;) {
      try {
        const ok = await this.redis.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
        if (ok === 'OK') return token;
      } catch (error) {
        // Redis caído: se degrada al lock local, que ya está tomado. Es peor
        // que el distribuido pero infinitamente mejor que bloquear la emisión
        // de facturas porque la caché no responde.
        this.logger.error(
          `No se pudo tomar el lock distribuido de "${key}" (${
            (error as Error).message
          }). Se continúa solo con el lock local de esta instancia.`,
        );
        return null;
      }

      if (Date.now() >= deadline) {
        this.logger.warn(
          `Timeout esperando el lock distribuido de "${key}" tras ` +
            `${ACQUIRE_TIMEOUT_MS / 1000}s. Se continúa con el lock local.`,
        );
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  private async releaseRemote(key: string, token: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.eval(
        DocumentLockService.RELEASE_SCRIPT,
        1,
        key,
        token,
      );
    } catch (error) {
      // No se relanza: el trabajo ya se hizo y el lock vence solo por TTL.
      this.logger.error(
        `No se pudo liberar el lock "${key}": ${(error as Error).message}. ` +
          `Vencerá solo en ${LOCK_TTL_MS / 1000}s.`,
      );
    }
  }
}
