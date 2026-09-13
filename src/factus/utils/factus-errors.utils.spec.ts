import {
  classifyDianErrors,
  extractDocumentErrors,
  parseFactusValidationErrors,
} from './factus-errors.utils';

/**
 * El caso que motivó todo esto: la respuesta REAL de producción del 12 sep 2026
 * al intentar la nota crédito de la factura A849. El array de errores viene
 * dentro de `data`, no en la raíz.
 */
const RESPUESTA_422_REGLA_90 = {
  status: 'Validation error',
  message: 'El documento contiene errores de validación',
  data: {
    message: 'El documento contiene errores de validación',
    errors: ['Regla: 90, Rechazo: Documento procesado anteriormente.'],
  },
};

describe('parseFactusValidationErrors', () => {
  it('lee los errores de `data.errors` (la forma real de la API)', () => {
    expect(parseFactusValidationErrors(RESPUESTA_422_REGLA_90)).toEqual([
      'Regla: 90, Rechazo: Documento procesado anteriormente.',
    ]);
  });

  it('no revienta cuando `errors` es un array (antes daba TypeError)', () => {
    // El código anterior hacía Object.entries(array) y luego .map() sobre un
    // string, convirtiendo un 422 legible en un 500.
    expect(() =>
      parseFactusValidationErrors({ data: { errors: ['a', 'b'] } }),
    ).not.toThrow();
  });

  it('soporta la forma de validación de payload `{campo: [msgs]}`', () => {
    expect(
      parseFactusValidationErrors({
        data: { errors: { customer: ['El campo es obligatorio'] } },
      }),
    ).toEqual(['customer: El campo es obligatorio']);
  });

  it('no antepone la clave cuando es el número de regla', () => {
    expect(
      parseFactusValidationErrors({
        data: { errors: { '90': 'Regla: 90, Rechazo: …' } },
      }),
    ).toEqual(['Regla: 90, Rechazo: …']);
  });

  it('cae al `message` cuando no hay nada estructurado', () => {
    expect(parseFactusValidationErrors({ message: 'Algo falló' })).toEqual([
      'Algo falló',
    ]);
  });

  it('acepta también `errors` en la raíz', () => {
    expect(parseFactusValidationErrors({ errors: ['x'] })).toEqual(['x']);
  });
});

describe('classifyDianErrors', () => {
  it('clasifica la Regla 90 como already-processed, NO como rechazo', () => {
    // El texto contiene "Rechazo", así que un /rechazo/i a secas la daba por
    // rechazo de contenido y aconsejaba borrar y reenviar — las dos cosas que
    // alargaron el incidente A773.
    expect(
      classifyDianErrors([
        'Regla: 90, Rechazo: Documento procesado anteriormente.',
      ]),
    ).toBe('already-processed');
  });

  it('clasifica un rechazo de contenido como rejected', () => {
    expect(
      classifyDianErrors(['Regla: DD14, Rechazo: El NIT del emisor no coincide']),
    ).toBe('rejected');
  });

  it('trata las notificaciones informativas como pending, no como rechazo', () => {
    // FAJ43b y RUT01 salen siempre (el nombre no calza letra por letra con el
    // RUT) y el documento es válido igual.
    expect(
      classifyDianErrors([
        'Regla: FAJ43b, Notificación: El nombre no coincide con el RUT',
        'Regla: RUT01, Notificación: …',
      ]),
    ).toBe('pending');
  });

  it('sin errores es pending (demora de la DIAN)', () => {
    expect(classifyDianErrors([])).toBe('pending');
  });
});

describe('extractDocumentErrors', () => {
  it('encuentra los errores bajo la clave del documento', () => {
    expect(
      extractDocumentErrors(
        { data: { credit_note: { errors: ['Regla: 90, Rechazo: …'] } } },
        'credit_note',
      ),
    ).toEqual(['Regla: 90, Rechazo: …']);
  });

  it('funciona cuando el documento no está anidado', () => {
    expect(
      extractDocumentErrors({ data: { errors: ['x'] } }, 'credit_note'),
    ).toEqual(['x']);
  });

  it('devuelve lista vacía cuando no hay errores', () => {
    expect(
      extractDocumentErrors({ data: { bill: { number: 'A849' } } }, 'bill'),
    ).toEqual([]);
  });
});
