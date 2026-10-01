import { BadRequestException } from '@nestjs/common';

/**
 * Medios de pago de Factus por `PayType.code` del sistema.
 *
 * Estaba duplicado en facturas, notas crédito y documento soporte. Se centraliza
 * aquí para que los cinco documentos hablen el mismo idioma con la DIAN: si un
 * día cambia el mapeo de un medio de pago, cambiarlo en un sitio y olvidarlo en
 * otros deja documentos con el medio de pago equivocado, que es un dato que la
 * DIAN sí valida.
 */
export interface FactusPayment {
  /** `payment_form`: 1 = contado, 2 = crédito. */
  form: string;
  /** `payment_method_code` del catálogo de Factus. */
  method: string;
}

const PAYMENT_METHOD_MAP: Record<string, FactusPayment> = {
  EFE: { form: '1', method: '10' }, // efectivo
  TRAS: { form: '1', method: '42' }, // consignación / transferencia
  CRE: { form: '2', method: '1' }, // crédito diferido
  EFECT: { form: '1', method: '10' },
  NA: { form: '1', method: '42' },
};

/** Medio de pago para un `PayType.code`; cae en consignación si no se conoce. */
export const resolveFactusPayment = (
  payTypeCode?: string | null,
): FactusPayment => {
  return PAYMENT_METHOD_MAP[payTypeCode ?? ''] ?? PAYMENT_METHOD_MAP.TRAS;
};

/** Fecha de hoy en Colombia (YYYY-MM-DD), no en UTC: a las 8 pm ya es "mañana" en UTC. */
const todayBogota = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
    new Date(),
  );

const toIsoDate = (value: Date | string): string =>
  typeof value === 'string'
    ? value.slice(0, 10)
    : new Date(value.getTime() - value.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);

/**
 * Un elemento de `payment_details` para el documento.
 *
 * Si el pago es a crédito (`payment_form '2'`) Factus exige `due_date`
 * (`YYYY-MM-DD`): la sacamos de `Invoice.dueDate`, el vencimiento FINAL. Las
 * cuotas y los abonos son control interno de samawe y no viajan a la DIAN.
 *
 * `strict` (solo la factura de venta): rechaza un plazo ya vencido, porque la
 * DIAN no acepta un vencimiento anterior a la emisión. En las notas y el
 * documento soporte —que se emiten después— se sube al día de hoy.
 */
export const buildFactusPaymentDetail = (
  invoice: { payType?: { code?: string | null } | null; dueDate?: Date | string | null },
  amount: string,
  strict = false,
): Record<string, string> => {
  const payment = resolveFactusPayment(invoice.payType?.code);
  const detail: Record<string, string> = {
    payment_form: payment.form,
    payment_method_code: payment.method,
    amount,
  };
  if (payment.form !== '2') return detail;

  if (!invoice.dueDate) {
    throw new BadRequestException(
      'La factura es a crédito pero no tiene plazo: defina 30, 60 o 90 días ' +
        'antes de emitirla (Factus exige la fecha de vencimiento).',
    );
  }
  const due = toIsoDate(invoice.dueDate);
  const today = todayBogota();
  if (due < today) {
    if (strict) {
      throw new BadRequestException(
        `El vencimiento de la factura (${due}) ya pasó. Vuelva a definir el ` +
          'plazo de crédito para que cuente desde hoy antes de emitirla.',
      );
    }
    detail.due_date = today;
  } else {
    detail.due_date = due;
  }
  return detail;
};
