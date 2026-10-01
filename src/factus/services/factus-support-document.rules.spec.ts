import { BadRequestException } from '@nestjs/common';
import { FactusSupportDocumentService } from './factus-support-document.service';

/**
 * Reglas DIAN del documento soporte (a quién se emite y con qué precios).
 * Se prueban sin Factus ni base de datos: el servicio se instancia sin
 * constructor y solo se ejercitan métodos puros.
 */
const service = Object.create(
  FactusSupportDocumentService.prototype,
) as FactusSupportDocumentService;

describe('assertEligibleProvider', () => {
  const customer = (over: Record<string, string> = {}) => ({
    names: 'JUAN PÉREZ',
    legal_organization_code: '2', // natural
    tribute_code: 'ZZ', // no responsable
    ...over,
  });

  it('acepta una persona natural no responsable de IVA', () => {
    expect(() => service.assertEligibleProvider(customer())).not.toThrow();
  });

  it('sin tribute_code se asume "no aplica" (es lo que se envía a Factus)', () => {
    expect(() =>
      service.assertEligibleProvider(customer({ tribute_code: '' as any })),
    ).not.toThrow();
  });

  it('rechaza una persona jurídica: debe expedir su propia factura', () => {
    expect(() =>
      service.assertEligibleProvider(customer({ legal_organization_code: '1' })),
    ).toThrow(/persona jurídica/);
  });

  it.each(['01', '04', 'ZA'])(
    'rechaza un responsable de impuestos (tribute_code %s)',
    (tribute_code) => {
      expect(() =>
        service.assertEligibleProvider(customer({ tribute_code })),
      ).toThrow(/responsable de impuestos/);
    },
  );

  it('los dos rechazos son BadRequest (error accionable, no 500)', () => {
    expect(() =>
      service.assertEligibleProvider(customer({ legal_organization_code: '1' })),
    ).toThrow(BadRequestException);
  });

  it('nombra al proveedor en el mensaje', () => {
    expect(() =>
      service.assertEligibleProvider(customer({ tribute_code: '01' })),
    ).toThrow(/JUAN PÉREZ/);
  });
});

describe('findTaxedItems / assertNoTaxes', () => {
  const item = (name: string, rate: string) => ({
    name,
    taxes: [{ code: '01', rate }],
  });

  it('detecta los ítems con impuesto mayor que cero', () => {
    expect(
      FactusSupportDocumentService.findTaxedItems([
        item('PAPA', '0.00'),
        item('LECHE', '19.00'),
        item('SAL', '5.00'),
      ]),
    ).toEqual(['LECHE', 'SAL']);
  });

  it('una compra sin impuestos no tiene ítems con impuesto', () => {
    expect(
      FactusSupportDocumentService.findTaxedItems([item('PAPA', '0.00')]),
    ).toEqual([]);
  });

  it('assertNoTaxes rechaza la compra con impuesto y dice cuáles ítems', () => {
    const fake = Object.create(
      FactusSupportDocumentService.prototype,
    ) as any;
    fake.invoiceService = { mapDetail: (d: any) => d.item };
    const invoice = {
      invoiceDetails: [
        { item: item('PAPA', '0.00') },
        { item: item('LECHE', '19.00') },
        { item: item('BORRADO', '19.00'), deletedAt: new Date() },
      ],
    } as any;
    expect(() => fake.assertNoTaxes(invoice)).toThrow(/LECHE/);
    // el ítem borrado no cuenta
    expect(() => fake.assertNoTaxes(invoice)).not.toThrow(/BORRADO/);
  });

  it('assertNoTaxes acepta una compra toda en "sin impuesto"', () => {
    const fake = Object.create(
      FactusSupportDocumentService.prototype,
    ) as any;
    fake.invoiceService = { mapDetail: (d: any) => d.item };
    expect(() =>
      fake.assertNoTaxes({
        invoiceDetails: [{ item: item('PAPA', '0.00') }],
      }),
    ).not.toThrow();
  });
});
