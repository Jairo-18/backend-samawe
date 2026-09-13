import { buildNoteReferenceCode } from './factus-reference.utils';

describe('buildNoteReferenceCode', () => {
  it('es DETERMINISTA: dos llamadas iguales dan el mismo código', () => {
    // Es la propiedad que importa. Con `Date.now()` cada reintento generaba un
    // código distinto, y para Factus eso no es un reintento sino un documento
    // nuevo: el atascado seguía bloqueando y los pendientes se multiplicaban.
    expect(buildNoteReferenceCode('NC', 'A849', 0)).toBe(
      buildNoteReferenceCode('NC', 'A849', 0),
    );
  });

  it('arranca en 1 cuando no hay notas previas', () => {
    expect(buildNoteReferenceCode('NC', 'A849', 0)).toBe('NC-A849-1');
  });

  it('avanza con las notas ya persistidas, para no colisionar entre parciales', () => {
    expect(buildNoteReferenceCode('NC', 'A849', 1)).toBe('NC-A849-2');
    expect(buildNoteReferenceCode('NC', 'A849', 2)).toBe('NC-A849-3');
  });

  it('separa los tres tipos de nota', () => {
    expect(buildNoteReferenceCode('NC', 'A849', 0)).toBe('NC-A849-1');
    expect(buildNoteReferenceCode('ND', 'A849', 0)).toBe('ND-A849-1');
    expect(buildNoteReferenceCode('NA', 'A849', 0)).toBe('NA-A849-1');
  });

  it('una nota atascada (no persistida) reusa el código: es el reintento oficial', () => {
    // Si el intento falló, no se persistió nada, así que el contador no avanza
    // y el siguiente intento cae en la MISMA referencia. Factus deduplica por
    // ella y reconsulta el estado en la DIAN en vez de crear otro documento.
    const primerIntento = buildNoteReferenceCode('NC', 'A849', 0);
    const reintento = buildNoteReferenceCode('NC', 'A849', 0);
    expect(reintento).toBe(primerIntento);
  });
});
