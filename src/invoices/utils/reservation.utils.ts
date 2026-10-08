import {
  RESERVATION_MAX_ADVANCE_DAYS,
  RESERVATION_MAX_NIGHTS,
} from '../constants/reservation.constants';

/**
 * Fechas de una estadía reservada por el huésped.
 *
 * El huésped elige DÍAS (`YYYY-MM-DD`); la base guarda INSTANTES con hora, como
 * ya hace el formulario del recepcionista: entrada 15:00 y salida 12:00, hora de
 * Colombia. Hay que producir exactamente lo mismo que manda ese formulario, o el
 * chequeo de solape (`startDate < :end AND endDate > :start`) deja de ser
 * coherente entre reservas del personal y reservas online.
 *
 * El formulario manda `toISOString()`, o sea UTC. Colombia es UTC−5 todo el año
 * (sin horario de verano), así que 15:00 → 20:00Z y 12:00 → 17:00Z. Salida e
 * ingreso del mismo día no solapan (17:00Z < 20:00Z): el día de salida queda
 * libre, como corresponde.
 */
export const CHECK_IN_UTC_HOUR = 20; // 15:00 en Colombia
export const CHECK_OUT_UTC_HOUR = 17; // 12:00 en Colombia

const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` → ms UTC de esa medianoche; `null` si no es una fecha real. */
export const parseDay = (value: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Rechaza lo que JS "corrige" (31 de febrero → 3 de marzo).
  return new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
};

/** Hoy en Colombia (`YYYY-MM-DD`), sin depender de la zona del servidor. */
export const todayInColombia = (now: Date = new Date()): string =>
  new Date(now.getTime() + COLOMBIA_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Resultado de validar una estadía. Interfaz plana y no unión discriminada: el
 * proyecto compila sin `strictNullChecks`, y ahí TypeScript no estrecha la unión
 * por `ok`. Si `ok` es false, solo `error` viene lleno.
 */
export interface StayPlan {
  ok: boolean;
  error?: string;
  nights?: number;
  /** ISO con la hora de entrada, igual a lo que manda el formulario. */
  startAt?: string;
  /** ISO con la hora de salida. */
  endAt?: string;
}

/** Valida el rango pedido y arma los instantes que se guardan. */
export const planStay = (
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): StayPlan => {
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (start === null || end === null) {
    return { ok: false, error: 'Las fechas deben tener formato AAAA-MM-DD.' };
  }

  const today = parseDay(todayInColombia(now)) as number;
  if (start < today) {
    return { ok: false, error: 'La fecha de entrada no puede ser pasada.' };
  }
  if (start > today + RESERVATION_MAX_ADVANCE_DAYS * DAY_MS) {
    return {
      ok: false,
      error: `Solo se puede reservar con hasta ${RESERVATION_MAX_ADVANCE_DAYS} días de anticipación.`,
    };
  }

  const nights = Math.round((end - start) / DAY_MS);
  if (nights < 1) {
    return {
      ok: false,
      error: 'La salida debe ser posterior a la entrada (mínimo 1 noche).',
    };
  }
  if (nights > RESERVATION_MAX_NIGHTS) {
    return {
      ok: false,
      error: `Una reserva en línea admite hasta ${RESERVATION_MAX_NIGHTS} noches. Para una estadía más larga, comunícate con recepción.`,
    };
  }

  return {
    ok: true,
    nights,
    startAt: `${startDate}T${String(CHECK_IN_UTC_HOUR).padStart(2, '0')}:00:00.000Z`,
    endAt: `${endDate}T${String(CHECK_OUT_UTC_HOUR).padStart(2, '0')}:00:00.000Z`,
  };
};

/**
 * Texto libre que escribe el huésped: se limpia (caracteres de control fuera,
 * espacios colapsados) y se acota. Va a `Invoice.observations` (varchar 500) y
 * luego se muestra al personal y en el PDF, así que no debe poder romper nada.
 */
export const cleanFreeText = (value: unknown, max: number): string => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
};

/**
 * Precio por noche con huéspedes extra.
 *
 * `priceSale` cubre hasta `includedGuests` (el mínimo de personas del hospedaje)
 * y cada huésped por encima suma `extraPersonPrice` por noche. Ambos llevan el
 * impuesto incluido, así que la suma sigue siendo "con impuesto". Con
 * `extraPersonPrice` en 0 (lo habitual) devuelve `priceSale` tal cual.
 */
export const nightlyRate = (
  priceSale: number,
  extraPersonPrice: number,
  includedGuests: number,
  guests: number,
): number => {
  const included = Math.max(1, Number(includedGuests) || 1);
  const extras = Math.max(0, Math.floor(guests) - included);
  const extra = Math.max(0, Number(extraPersonPrice) || 0);
  return Math.round((Number(priceSale) + extras * extra) * 100) / 100;
};
