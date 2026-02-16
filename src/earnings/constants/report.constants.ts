// constants/payment-types.constant.ts
export const PAYMENT_TYPES = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'EFECTIVO Y TRANSFERENCIA',
  'CONSIGNACION',
  'CREDITO',
] as const;

export const PAIDMENT_TYPES = ['PAGADO', 'RESERVADO - PAGADO'] as const;

export const CATEGORY_TYPES = [
  'BAR',
  'RESTAURANTE',
  'OTROS',
  'MECATO',
  'HOSPEDAJE',
  'PASADIA',
  'SERVICIOS',
] as const;
