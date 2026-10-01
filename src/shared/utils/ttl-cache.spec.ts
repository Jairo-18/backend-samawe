import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('devuelve lo guardado mientras no venza', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1, 0);
    expect(cache.get('a', 999)).toBe(1);
  });

  it('lo vencido desaparece (y se borra, no se queda ocupando memoria)', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1, 0);
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('guardar de nuevo renueva el vencimiento', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1, 0);
    cache.set('a', 2, 900);
    expect(cache.get('a', 1500)).toBe(2);
  });

  it('respeta el tope de tamaño quitando lo más antiguo', () => {
    const cache = new TtlCache<number>(10_000, 3);
    cache.set('a', 1, 0);
    cache.set('b', 2, 1);
    cache.set('c', 3, 2);
    cache.set('d', 4, 3);
    expect(cache.size).toBe(3);
    expect(cache.get('a', 4)).toBeUndefined();
    expect(cache.get('d', 4)).toBe(4);
  });

  it('al llenarse, primero se descarta lo vencido y no lo vigente', () => {
    const cache = new TtlCache<number>(100, 2);
    cache.set('viejo', 1, 0);
    cache.set('b', 2, 150); // 'viejo' ya venció
    cache.set('c', 3, 160);
    expect(cache.get('b', 170)).toBe(2);
    expect(cache.get('c', 170)).toBe(3);
  });

  it('clear vacía todo', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
