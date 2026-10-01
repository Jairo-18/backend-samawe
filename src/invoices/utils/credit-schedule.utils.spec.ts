import {
  addDays,
  buildCreditSummary,
  isValidCreditDays,
} from './credit-schedule.utils';

describe('credit-schedule.utils', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-01-31', 30)).toBe('2026-03-02');
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14');
  });

  it('solo acepta 30, 60 o 90', () => {
    expect(isValidCreditDays(30)).toBe(true);
    expect(isValidCreditDays(45)).toBe(false);
  });

  it('30 días = 1 cuota, 60 = 2, 90 = 3, y la suma cuadra al centavo', () => {
    const one = buildCreditSummary(100000, 30, '2026-10-01', [], '2026-10-01');
    expect(one.installments).toHaveLength(1);
    const three = buildCreditSummary(100000, 90, '2026-10-01', [], '2026-10-01');
    expect(three.installments.map((i) => i.dueDate)).toEqual([
      '2026-10-31',
      '2026-11-30',
      '2026-12-30',
    ]);
    const sum = three.installments.reduce((s, i) => s + i.amount, 0);
    expect(Math.round(sum * 100)).toBe(10000000);
    expect(three.installments[2].amount).toBeCloseTo(33333.34, 2);
  });

  it('los abonos se aplican a la cuota más antigua primero', () => {
    const s = buildCreditSummary(90000, 90, '2026-10-01', [40000], '2026-10-05');
    expect(s.installments.map((i) => i.status)).toEqual([
      'PAID',
      'PARTIAL',
      'PENDING',
    ]);
    expect(s.installments[1].paid).toBe(10000);
    expect(s.paid).toBe(40000);
    expect(s.balance).toBe(50000);
    expect(s.status).toBe('PARTIAL');
  });

  it('marca vencida la cuota impaga cuyo día ya pasó', () => {
    const s = buildCreditSummary(60000, 60, '2026-10-01', [], '2026-11-15');
    expect(s.installments[0].status).toBe('OVERDUE');
    expect(s.installments[1].status).toBe('PENDING');
    expect(s.status).toBe('OVERDUE');
  });

  it('pagada del todo queda PAID aunque haya vencido', () => {
    const s = buildCreditSummary(60000, 60, '2026-10-01', [60000], '2027-01-01');
    expect(s.status).toBe('PAID');
    expect(s.balance).toBe(0);
  });
});
