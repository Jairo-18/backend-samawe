import { BadRequestException } from '@nestjs/common';
import { FactusCreditNoteService } from './factus-credit-note.service';
import { sumFactusItemsTotal } from '../utils/factus-math.utils';

/**
 * Parte nueva de la nota crédito: neutralizar notas débito. Se prueba sin
 * Factus ni base de datos instanciando el servicio sin constructor — solo se
 * ejercitan métodos puros.
 */
const service = Object.create(
  FactusCreditNoteService.prototype,
) as FactusCreditNoteService;

const debitNote = (id: number, items: unknown[], number = `NDF${id}`) =>
  ({
    debitNoteId: id,
    referenceCode: `ND-${id}`,
    factusNumber: number,
    itemsSnapshot: items,
  }) as any;

// Lo que guarda la nota débito: el ítem exacto enviado a Factus.
const interest = {
  code_reference: 'ND-1',
  name: 'Intereses de mora',
  quantity: '1.00',
  discount_rate: '0.00',
  price: '1000.00',
  unit_measure_code: '94',
  standard_code: '999',
  taxes: [{ code: '01', rate: '19.00' }],
};

describe('buildDebitNeutralizationItems', () => {
  const build = (notes: any[]) =>
    (service as any).buildDebitNeutralizationItems(notes) as Record<
      string,
      unknown
    >[];

  it('copia precio, cantidad e impuesto: el total cubre exactamente la nota débito', () => {
    const items = build([debitNote(1, [interest])]);
    expect(sumFactusItemsTotal(items as any)).toBe(
      sumFactusItemsTotal([interest] as any),
    );
  });

  it('prefija la descripción con la nota que anula y no repite code_reference', () => {
    const items = build([debitNote(1, [interest]), debitNote(2, [interest])]);
    expect(items[0].name).toBe('Anulación NDF1: Intereses de mora');
    expect(new Set(items.map((i) => i.code_reference)).size).toBe(2);
  });

  it('no pasa de 200 caracteres en el nombre', () => {
    const long = { ...interest, name: 'x'.repeat(300) };
    expect(String(build([debitNote(1, [long])])[0].name).length).toBe(200);
  });

  it('falla claro si la nota débito no guardó sus conceptos', () => {
    expect(() => build([debitNote(1, [])])).toThrow(BadRequestException);
  });
});

describe('hash anti-duplicado', () => {
  const hash = (ids: number[]) =>
    (service as any).computeRequestHash(false, '3', [], ids) as string;

  it('cambia según las notas débito que se neutralizan', () => {
    expect(hash([1])).not.toBe(hash([2]));
    expect(hash([1])).not.toBe(hash([]));
  });

  it('no depende del orden de los ids', () => {
    expect(hash([1, 2])).toBe(hash([2, 1]));
  });

  it('noteHash reproduce el hash de la solicitud (protege contra el doble clic)', () => {
    const note = {
      isTotal: false,
      correctionConceptCode: '3',
      itemsSnapshot: [],
      neutralizedDebitNoteIds: [1],
    } as any;
    expect((service as any).noteHash(note)).toBe(hash([1]));
  });
});
