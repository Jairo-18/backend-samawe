/**
 * Períodos del tablero de ganancias, en hora de Colombia (UTC−5, sin horario de
 * verano).
 *
 * Todo se calcula desplazando el instante a "hora local de Colombia" y leyendo
 * con los getters UTC: así el resultado no depende de la zona horaria del
 * servidor (el contenedor de producción corre en UTC; un desarrollador, en
 * Bogotá). Mezclar `getTimezoneOffset` con getters locales —como hacía el
 * resumen anterior— da otro resultado según dónde corra el proceso.
 */

export type DashboardPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
];

/** Rango libre: dos fechas `YYYY-MM-DD` en hora de Colombia, AMBAS inclusive. */
export interface CustomRange {
  from: string;
  to: string;
}

/** Hasta qué largo se acepta un rango libre (3 años). */
export const MAX_CUSTOM_DAYS = 1096;

/** Un rango de hasta este largo se agrupa por día; más largo, por mes. */
const CUSTOM_DAILY_MAX_DAYS = 92;

/** Colombia está en UTC−5 todo el año. */
const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Instante real → "hora de pared" de Colombia, representada como Date UTC. */
const toLocal = (utc: Date): Date =>
  new Date(utc.getTime() + COLOMBIA_OFFSET_MS);

/** "Hora de pared" de Colombia (Date UTC) → instante real. */
const toInstant = (local: Date): Date =>
  new Date(local.getTime() - COLOMBIA_OFFSET_MS);

export interface PeriodRange {
  /** Primer instante del período (inclusive). */
  start: Date;
  /** Primer instante DESPUÉS del período (exclusive). */
  end: Date;
}

const parseDay = (value: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Rechaza fechas que JS "corrige" (31 de febrero → 3 de marzo).
  return new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
};

/** Valida un rango libre; devuelve el mensaje de error o `null` si está bien. */
export const validateCustomRange = (custom?: CustomRange): string | null => {
  if (!custom) return 'Falta el rango de fechas (from y to).';
  const from = parseDay(custom.from);
  const to = parseDay(custom.to);
  if (from === null || to === null) {
    return 'Las fechas deben tener el formato AAAA-MM-DD.';
  }
  if (to < from) return 'La fecha final no puede ser anterior a la inicial.';
  const days = (to - from) / DAY_MS + 1;
  if (days > MAX_CUSTOM_DAYS) {
    return `El rango no puede superar ${MAX_CUSTOM_DAYS} días.`;
  }
  return null;
};

/**
 * Rango de un período. `back` = cuántos períodos hacia atrás (0 = el actual,
 * 1 = el anterior). La semana va de lunes a domingo. En un rango libre, el
 * "anterior" es el de la misma duración inmediatamente antes.
 */
export const periodRange = (
  period: DashboardPeriod,
  now: Date,
  back = 0,
  custom?: CustomRange,
): PeriodRange => {
  const local = toLocal(now);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  let start: number;
  let end: number;
  switch (period) {
    case 'daily':
      start = Date.UTC(y, m, d - back);
      end = start + DAY_MS;
      break;
    case 'weekly': {
      const dow = local.getUTCDay() || 7; // lunes = 1 … domingo = 7
      start = Date.UTC(y, m, d - (dow - 1) - 7 * back);
      end = start + 7 * DAY_MS;
      break;
    }
    case 'monthly':
      start = Date.UTC(y, m - back, 1);
      end = Date.UTC(y, m - back + 1, 1);
      break;
    case 'yearly':
      start = Date.UTC(y - back, 0, 1);
      end = Date.UTC(y - back + 1, 0, 1);
      break;
    case 'custom': {
      const from = custom ? parseDay(custom.from) : null;
      const to = custom ? parseDay(custom.to) : null;
      if (from === null || to === null) {
        throw new Error('Rango libre sin fechas válidas');
      }
      const length = to + DAY_MS - from;
      start = from - back * length;
      end = to + DAY_MS - back * length;
      break;
    }
  }
  return { start: toInstant(new Date(start)), end: toInstant(new Date(end)) };
};

const rangeDays = (range: PeriodRange): number =>
  Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);

/** Un rango libre largo se agrupa por mes; uno corto, por día. */
const customByMonth = (range: PeriodRange): boolean =>
  rangeDays(range) > CUSTOM_DAILY_MAX_DAYS;

/** Meses (del calendario) que toca un rango libre: de su primer a su último día. */
const monthSpan = (range: PeriodRange): number => {
  const a = toLocal(range.start);
  const b = toLocal(new Date(range.end.getTime() - 1));
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) +
    1
  );
};

/** Cuántas casillas tiene la serie de un rango: horas, días o meses. */
export const bucketCount = (
  period: DashboardPeriod,
  range: PeriodRange,
): number => {
  switch (period) {
    case 'daily':
      return 24;
    case 'weekly':
      return 7;
    case 'monthly':
      return rangeDays(range);
    case 'yearly':
      return 12;
    case 'custom':
      return customByMonth(range) ? monthSpan(range) : rangeDays(range);
  }
};

/**
 * Casilla (0-based) de un instante dentro de un rango. Devuelve -1 si cae fuera.
 * Diario → hora; semanal y mensual → día; anual → mes; libre → día o mes.
 */
export const bucketIndex = (
  period: DashboardPeriod,
  range: PeriodRange,
  instant: Date,
): number => {
  if (instant < range.start || instant >= range.end) return -1;
  const local = toLocal(instant);
  const startLocal = toLocal(range.start);
  switch (period) {
    case 'daily':
      return local.getUTCHours();
    case 'weekly':
    case 'monthly':
      return Math.floor((local.getTime() - startLocal.getTime()) / DAY_MS);
    case 'yearly':
      return local.getUTCMonth();
    case 'custom':
      if (customByMonth(range)) {
        return (
          (local.getUTCFullYear() - startLocal.getUTCFullYear()) * 12 +
          (local.getUTCMonth() - startLocal.getUTCMonth())
        );
      }
      return Math.floor((local.getTime() - startLocal.getTime()) / DAY_MS);
  }
};

/** Instante en que empieza una casilla (para que el cliente la rotule). */
export const bucketStart = (
  period: DashboardPeriod,
  range: PeriodRange,
  index: number,
): Date => {
  const startLocal = toLocal(range.start);
  switch (period) {
    case 'daily':
      return toInstant(new Date(startLocal.getTime() + index * 60 * 60 * 1000));
    case 'weekly':
    case 'monthly':
      return toInstant(new Date(startLocal.getTime() + index * DAY_MS));
    case 'yearly':
      return toInstant(new Date(Date.UTC(startLocal.getUTCFullYear(), index, 1)));
    case 'custom': {
      if (!customByMonth(range)) {
        return toInstant(new Date(startLocal.getTime() + index * DAY_MS));
      }
      const monthStart = Date.UTC(
        startLocal.getUTCFullYear(),
        startLocal.getUTCMonth() + index,
        1,
      );
      // La primera casilla empieza donde empieza el rango, no el día 1 del mes.
      return toInstant(new Date(Math.max(monthStart, startLocal.getTime())));
    }
  }
};

export const isDashboardPeriod = (value: unknown): value is DashboardPeriod =>
  DASHBOARD_PERIODS.includes(value as DashboardPeriod);
