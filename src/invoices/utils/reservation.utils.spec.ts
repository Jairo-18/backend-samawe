import {
  cleanFreeText,
  nightlyRate,
  parseDay,
  planStay,
  todayInColombia,
} from './reservation.utils';

// 2026-10-10 15:00 en Colombia = 20:00Z.
const NOW = new Date('2026-10-10T20:00:00.000Z');

describe('todayInColombia', () => {
  it('a las 02:00Z todavía es el día anterior en Colombia', () => {
    expect(todayInColombia(new Date('2026-10-11T02:00:00.000Z'))).toBe(
      '2026-10-10',
    );
  });

  it('a las 05:00Z ya es el día nuevo', () => {
    expect(todayInColombia(new Date('2026-10-11T05:00:00.000Z'))).toBe(
      '2026-10-11',
    );
  });
});

describe('parseDay', () => {
  it('acepta una fecha real', () => {
    expect(parseDay('2026-10-10')).not.toBeNull();
  });

  it.each(['2026-02-31', '2026-13-01', '10/10/2026', '', 'hoy'])(
    'rechaza %p',
    (v) => {
      expect(parseDay(v)).toBeNull();
    },
  );
});

describe('planStay', () => {
  it('arma entrada 15:00 y salida 12:00 de Colombia, en UTC', () => {
    const plan = planStay('2026-10-12', '2026-10-14', NOW);
    expect(plan).toEqual({
      ok: true,
      nights: 2,
      startAt: '2026-10-12T20:00:00.000Z',
      endAt: '2026-10-14T17:00:00.000Z',
    });
  });

  it('la salida y la entrada del mismo día no solapan', () => {
    const a = planStay('2026-10-12', '2026-10-14', NOW);
    const b = planStay('2026-10-14', '2026-10-15', NOW);
    if (!a.ok || !b.ok) throw new Error('plan inválido');
    expect(new Date(a.endAt).getTime()).toBeLessThan(
      new Date(b.startAt).getTime(),
    );
  });

  it('permite entrar hoy', () => {
    expect(planStay('2026-10-10', '2026-10-11', NOW).ok).toBe(true);
  });

  it('rechaza una entrada pasada, contando el día de Colombia', () => {
    // A las 02:00Z del 11 sigue siendo 10 en Colombia: el 10 es válido, el 9 no.
    const late = new Date('2026-10-11T02:00:00.000Z');
    expect(planStay('2026-10-10', '2026-10-11', late).ok).toBe(true);
    expect(planStay('2026-10-09', '2026-10-11', late).ok).toBe(false);
  });

  it('rechaza salida igual o anterior a la entrada', () => {
    expect(planStay('2026-10-12', '2026-10-12', NOW).ok).toBe(false);
    expect(planStay('2026-10-12', '2026-10-11', NOW).ok).toBe(false);
  });

  it('rechaza formato inválido y fechas imposibles', () => {
    expect(planStay('2026-10-12T10:00', '2026-10-14', NOW).ok).toBe(false);
    expect(planStay('2026-02-31', '2026-03-02', NOW).ok).toBe(false);
  });

  it('tope de 30 noches', () => {
    expect(planStay('2026-10-12', '2026-11-11', NOW).ok).toBe(true); // 30
    expect(planStay('2026-10-12', '2026-11-12', NOW).ok).toBe(false); // 31
  });

  it('tope de anticipación de 365 días', () => {
    expect(planStay('2027-10-10', '2027-10-11', NOW).ok).toBe(true);
    expect(planStay('2027-10-11', '2027-10-12', NOW).ok).toBe(false);
  });
});

describe('cleanFreeText', () => {
  it('quita caracteres de control y colapsa espacios', () => {
    expect(cleanFreeText('  hola\n\n  mundo\u0000!  ', 100)).toBe('hola mundo !');
  });

  it('acota el largo', () => {
    expect(cleanFreeText('a'.repeat(50), 10)).toHaveLength(10);
  });

  it('un valor que no es texto da vacío', () => {
    expect(cleanFreeText(undefined, 10)).toBe('');
    expect(cleanFreeText({ a: 1 }, 10)).toBe('');
  });
});

describe('nightlyRate', () => {
  it('sin extra configurado devuelve el precio base, sean cuantos sean', () => {
    expect(nightlyRate(280000, 0, 2, 5)).toBe(280000);
  });
  it('hasta las personas incluidas no suma', () => {
    expect(nightlyRate(280000, 30000, 2, 2)).toBe(280000);
    expect(nightlyRate(280000, 30000, 2, 1)).toBe(280000);
  });
  it('cada huésped por encima suma su valor', () => {
    expect(nightlyRate(280000, 30000, 2, 3)).toBe(310000);
    expect(nightlyRate(280000, 30000, 2, 5)).toBe(370000);
  });
  it('mínimo de personas ausente se toma como 1', () => {
    expect(nightlyRate(100000, 10000, 0, 3)).toBe(120000);
  });
  it('ignora un extra negativo o inválido', () => {
    expect(nightlyRate(100000, -5, 1, 3)).toBe(100000);
    expect(nightlyRate(100000, NaN, 1, 3)).toBe(100000);
  });
});
