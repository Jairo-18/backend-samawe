import { ConflictException } from '@nestjs/common';
import { FactusInvoiceService } from './factus-invoice.service';
import { DocumentLockService } from '../../shared/services/documentLock.service';

/**
 * Incidente 6 oct 2026: la FV 1019 recibió el code 00874, que ya usaba la FVE
 * 1016 (A862). Factus deduplica por reference_code y devolvería el bill de la
 * otra factura. Estas guardas impiden adjuntar un documento ajeno.
 */
describe('FactusInvoiceService — guardas de código duplicado', () => {
  const FVE_ID = 4;

  const build = (findOne: jest.Mock) => {
    const service = new FactusInvoiceService(
      { findOne } as never,
      {} as never,
      {} as never,
      {} as never,
      { findOne: jest.fn(async () => ({ invoiceTypeId: FVE_ID })) } as never,
      {} as never,
      new DocumentLockService(null),
    );
    return service as unknown as {
      assertBillNotOwnedByAnother: (i: unknown, r: unknown) => Promise<void>;
      assertRecoverableCode: (i: unknown) => Promise<void>;
    };
  };

  const result = { billNumber: 'A862' };

  describe('assertBillNotOwnedByAnother', () => {
    it('rechaza un número que ya es de otra factura', async () => {
      const s = build(jest.fn(async () => ({ invoiceId: 1016 })));
      await expect(
        s.assertBillNotOwnedByAnother({ invoiceId: 1019, code: '00874' }, result),
      ).rejects.toThrow(ConflictException);
    });

    it('acepta si el número es de la propia factura', async () => {
      const s = build(jest.fn(async () => ({ invoiceId: 1019 })));
      await expect(
        s.assertBillNotOwnedByAnother({ invoiceId: 1019, code: '00874' }, result),
      ).resolves.toBeUndefined();
    });

    it('acepta si nadie tiene ese número', async () => {
      const s = build(jest.fn(async () => null));
      await expect(
        s.assertBillNotOwnedByAnother({ invoiceId: 1019, code: '00879' }, result),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertRecoverableCode', () => {
    it('rechaza una FV cuyo code ya usa otra FVE (no se puede renumerar al recuperar)', async () => {
      const s = build(jest.fn(async () => ({ invoiceId: 1016 })));
      await expect(
        s.assertRecoverableCode({
          invoiceId: 1019,
          code: '00874',
          invoiceType: { invoiceTypeId: 1 },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deja pasar una FV sin choque', async () => {
      const s = build(jest.fn(async () => null));
      await expect(
        s.assertRecoverableCode({
          invoiceId: 1019,
          code: '00879',
          invoiceType: { invoiceTypeId: 1 },
        }),
      ).resolves.toBeUndefined();
    });

    it('no consulta nada si la factura ya es FVE', async () => {
      const findOne = jest.fn();
      const s = build(findOne);
      await s.assertRecoverableCode({
        invoiceId: 1016,
        code: '00874',
        invoiceType: { invoiceTypeId: FVE_ID },
      });
      expect(findOne).not.toHaveBeenCalled();
    });
  });
});
