import { BadRequestException } from '@nestjs/common';
import { buildFactusPaymentDetail } from './factus-payment.utils';

const daysFromToday = (n: number): string => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
  }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

describe('buildFactusPaymentDetail', () => {
  it('contado no lleva due_date', () => {
    const d = buildFactusPaymentDetail({ payType: { code: 'EFE' } }, '1000.00');
    expect(d).toEqual({
      payment_form: '1',
      payment_method_code: '10',
      amount: '1000.00',
    });
  });

  it('crédito manda payment_form 2 con el vencimiento final', () => {
    const due = daysFromToday(60);
    const d = buildFactusPaymentDetail(
      { payType: { code: 'CRE' }, dueDate: due },
      '1000.00',
      true,
    );
    expect(d.payment_form).toBe('2');
    expect(d.due_date).toBe(due);
  });

  it('crédito sin plazo se rechaza con un mensaje claro', () => {
    expect(() =>
      buildFactusPaymentDetail({ payType: { code: 'CRE' } }, '1000.00'),
    ).toThrow(BadRequestException);
  });

  it('factura de venta con vencimiento ya pasado se rechaza', () => {
    expect(() =>
      buildFactusPaymentDetail(
        { payType: { code: 'CRE' }, dueDate: daysFromToday(-1) },
        '1000.00',
        true,
      ),
    ).toThrow(/ya pasó/);
  });

  it('una nota con vencimiento pasado sube a hoy en vez de fallar', () => {
    const d = buildFactusPaymentDetail(
      { payType: { code: 'CRE' }, dueDate: daysFromToday(-30) },
      '1000.00',
    );
    expect(d.due_date).toBe(daysFromToday(0));
  });
});
