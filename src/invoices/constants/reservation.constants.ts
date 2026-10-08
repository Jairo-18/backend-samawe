/** Origen de una reserva creada por el huésped. NULL en la columna = personal. */
export const RESERVATION_SOURCE_ONLINE = 'ONLINE';

/**
 * Usuario interno "RESERVACIÓN WEB" que figura como empleado de las reservas que
 * hace el huésped. Se identifica por este correo (no sale a ningún lado: el
 * usuario está inactivo y sin contraseña). Lo crea la migración
 * `AddWebReservationUser`.
 */
export const WEB_RESERVATION_USER_EMAIL = 'reservacion.web@samawe.internal';

/**
 * Su documento. Los listados de usuarios lo excluyen por aquí y no por el correo:
 * `email <> 'x'` también descarta los NULL (p. ej. Consumidor Final).
 */
export const WEB_RESERVATION_USER_DOCUMENT = 'WEB-RESERVA';

/** Horas que se retienen las fechas sin pago (decisión del dueño: 24 h). */
export const RESERVATION_HOLD_HOURS = 24;

/** Noches máximas por reserva online. Más largo se coordina con recepción. */
export const RESERVATION_MAX_NIGHTS = 30;

/** Con cuánta anticipación máxima se puede reservar. */
export const RESERVATION_MAX_ADVANCE_DAYS = 365;

/**
 * Reservas online sin pagar que un mismo usuario puede tener a la vez. Sin tope,
 * una sola cuenta bloquearía el calendario entero sin pagar nada.
 */
export const RESERVATION_MAX_ACTIVE_PER_USER = 3;

/** Máximo de huéspedes aceptado como entrada (el aforo real lo da el hospedaje). */
export const RESERVATION_MAX_GUESTS_INPUT = 50;

/** Reservas que el cron libera por pasada. */
export const RESERVATION_RELEASE_BATCH = 50;

/** Códigos de `PaidType` (comparados en minúsculas, ver accommodationOccupancy). */
export const PAID_TYPE_RESERVED_PENDING = 'res';
export const PAID_TYPE_RESERVED_PAID = 'res2';

/** Código de `InvoiceType` de una venta en papel (no electrónica). */
export const RESERVATION_INVOICE_TYPE_CODE = 'FV';
