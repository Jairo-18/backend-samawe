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
export const resolveFactusPayment = (payTypeCode?: string | null): FactusPayment => {
  const payment = PAYMENT_METHOD_MAP[payTypeCode ?? ''] ?? PAYMENT_METHOD_MAP.TRAS;

  // Factus exige `payment_details[].due_date` cuando `payment_form` es '2'
  // (crédito), y hoy ningún documento tiene de dónde sacar ese plazo — los
  // 5 servicios de emisión arman `payment_details` sin due_date. Antes de
  // mandarle a Factus un documento que va a rechazar (o, peor, que acepte
  // incompleto), cortamos acá con un error claro.
  if (payment.form === '2') {
    throw new BadRequestException(
      'El medio de pago "crédito" (payment_form "2") no está soportado: ' +
        'Factus exige due_date en payment_details y el sistema todavía no ' +
        'define un plazo de crédito.',
    );
  }

  return payment;
};
