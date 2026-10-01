/**
 * Caché en memoria con vencimiento y tamaño máximo.
 *
 * Sirve para resultados caros de calcular que se piden seguido y que toleran
 * unos segundos de retraso (el tablero de ganancias). Es POR PROCESO: con varias
 * instancias cada una tiene la suya, que está bien para un dato de solo lectura
 * que vence en segundos.
 *
 * Tiene tope de tamaño porque algunas claves las arma el usuario (un rango de
 * fechas libre): sin tope, pedir rangos distintos llenaría la memoria.
 */
export class TtlCache<T> {
  private readonly _entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 100,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this._entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this._entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    // Re-insertar mueve la clave al final: el más viejo queda primero.
    this._entries.delete(key);
    this._entries.set(key, { value, expiresAt: now + this.ttlMs });
    this.evict(now);
  }

  clear(): void {
    this._entries.clear();
  }

  get size(): number {
    return this._entries.size;
  }

  private evict(now: number): void {
    // Primero lo vencido; si aún sobra, lo más antiguo.
    for (const [key, entry] of this._entries) {
      if (entry.expiresAt <= now) this._entries.delete(key);
    }
    while (this._entries.size > this.maxEntries) {
      const oldest = this._entries.keys().next().value as string;
      this._entries.delete(oldest);
    }
  }
}
