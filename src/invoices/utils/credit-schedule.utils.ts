/**
 * Plan de cuotas de una factura a crédito. Todo se deriva (no se guarda) del
 * total, el plazo y los abonos, para que no se desfase si cambia el total.
 *
 * Regla del dueño: una cuota cada 30 días. 30 días = 1 cuota, 60 = 2, 90 = 3.
 * El vencimiento final (start + creditDays) es lo único que va a la DIAN.
 */
export const CREDIT_DAYS_OPTIONS = [30, 60, 90] as const;
export const CREDIT_INSTALLMENT_DAYS = 30;

export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';

export interface CreditInstallment {
  number: number;
  dueDate: string;
  amount: number;
  paid: number;
  pending: number;
  status: InstallmentStatus;
}

export interface CreditSummary {
  total: number;
  paid: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  installments: CreditInstallment[];
}

const toCents = (n: number): number => Math.round(n * 100);
const fromCents = (c: number): number => c / 100;

/** Suma días a una fecha `YYYY-MM-DD` sin depender de la zona horaria. */
export const addDays = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

export const isValidCreditDays = (days: unknown): days is 30 | 60 | 90 =>
  CREDIT_DAYS_OPTIONS.includes(days as 30 | 60 | 90);

/**
 * @param today `YYYY-MM-DD` de referencia para marcar cuotas vencidas.
 */
export const buildCreditSummary = (
  total: number,
  creditDays: number,
  startDate: string,
  payments: number[],
  today: string,
): CreditSummary => {
  const count = creditDays / CREDIT_INSTALLMENT_DAYS;
  const totalCents = toCents(total);
  const base = Math.floor(totalCents / count);

  // El último se lleva el redondeo para que la suma sea exactamente el total.
  let remainingPaid = payments.reduce((sum, p) => sum + toCents(p), 0);
  const paidCents = remainingPaid;

  const installments: CreditInstallment[] = [];
  for (let i = 1; i <= count; i++) {
    const amountCents = i === count ? totalCents - base * (count - 1) : base;
    const applied = Math.min(remainingPaid, amountCents);
    remainingPaid -= applied;
    const dueDate = addDays(startDate, CREDIT_INSTALLMENT_DAYS * i);
    const pendingCents = amountCents - applied;
    let status: InstallmentStatus;
    if (pendingCents === 0) status = 'PAID';
    else if (dueDate < today) status = 'OVERDUE';
    else status = applied > 0 ? 'PARTIAL' : 'PENDING';
    installments.push({
      number: i,
      dueDate,
      amount: fromCents(amountCents),
      paid: fromCents(applied),
      pending: fromCents(pendingCents),
      status,
    });
  }

  const balanceCents = Math.max(totalCents - paidCents, 0);
  let status: CreditSummary['status'];
  if (balanceCents === 0) status = 'PAID';
  else if (installments.some((i) => i.status === 'OVERDUE')) status = 'OVERDUE';
  else status = paidCents > 0 ? 'PARTIAL' : 'PENDING';

  return {
    total: fromCents(totalCents),
    paid: fromCents(Math.min(paidCents, totalCents)),
    balance: fromCents(balanceCents),
    status,
    installments,
  };
};
