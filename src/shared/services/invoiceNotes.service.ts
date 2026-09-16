import { Injectable } from '@nestjs/common';
import { CreditNoteRepository } from '../repositories/creditNote.repository';
import { DebitNoteRepository } from '../repositories/debitNote.repository';
import { AdjustmentNoteRepository } from '../repositories/adjustmentNote.repository';
import { CreditNote } from '../entities/creditNote.entity';
import { DebitNote } from '../entities/debitNote.entity';
import { AdjustmentNote } from '../entities/adjustmentNote.entity';
import { Invoice } from '../entities/invoice.entity';
import {
  isPurchaseTypeCode,
  isSaleTypeCode,
} from '../constants/invoiceType.constants';

/**
 * Notas asociadas a un documento, ya agregadas.
 *
 * Espejo de `invoices/services/invoiceNotes.service.ts` en el frontend: los dos
 * generadores de PDF tienen que pintar exactamente lo mismo, y el neto tiene
 * que salir de la misma cuenta que el badge del listado.
 */
export interface InvoiceNotesSummary {
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  adjustmentNotes: AdjustmentNote[];
  /** Restado por notas crédito y de ajuste. */
  deducted: number;
  /** Sumado por notas débito. */
  added: number;
  net: number;
  /** El documento quedó sin valor: lo acreditado cubre su total. */
  annulled: boolean;
  any: boolean;
}

@Injectable()
export class InvoiceNotesService {
  constructor(
    private readonly creditNoteRepository: CreditNoteRepository,
    private readonly debitNoteRepository: DebitNoteRepository,
    private readonly adjustmentNoteRepository: AdjustmentNoteRepository,
  ) {}

  /**
   * Solo consulta lo que aplica al tipo: una factura no tiene notas de ajuste y
   * un documento soporte no tiene crédito ni débito.
   */
  async loadFor(invoice: Invoice): Promise<InvoiceNotesSummary> {
    const code = invoice.invoiceType?.code;
    const isSale = isSaleTypeCode(code);
    const isSupport = isPurchaseTypeCode(code);

    const [creditNotes, debitNotes, adjustmentNotes] = await Promise.all([
      isSale
        ? this.creditNoteRepository.find({
            where: { invoiceId: invoice.invoiceId },
          })
        : Promise.resolve([]),
      isSale
        ? this.debitNoteRepository.find({
            where: { invoiceId: invoice.invoiceId },
          })
        : Promise.resolve([]),
      isSupport
        ? this.adjustmentNoteRepository.find({
            where: { invoiceId: invoice.invoiceId },
          })
        : Promise.resolve([]),
    ]);

    return this.aggregate(
      creditNotes,
      debitNotes,
      adjustmentNotes,
      Number(invoice.total ?? 0),
    );
  }

  aggregate(
    creditNotes: CreditNote[],
    debitNotes: DebitNote[],
    adjustmentNotes: AdjustmentNote[],
    invoiceTotal = 0,
  ): InvoiceNotesSummary {
    const sum = (notes: { total: string }[]): number =>
      notes.reduce((acc, n) => acc + Number(n.total ?? 0), 0);

    const deducted = sum(creditNotes) + sum(adjustmentNotes);
    const added = sum(debitNotes);
    const total = Number(invoiceTotal ?? 0);

    return {
      creditNotes,
      debitNotes,
      adjustmentNotes,
      deducted,
      added,
      net: total - deducted + added,
      // Margen de un peso: los totales de la DIAN vienen redondeados y varias
      // notas parciales pueden quedar unos céntimos por debajo del total sin
      // que quede nada vivo. Mismo criterio que el frontend.
      annulled: total > 0 && deducted > 0 && deducted >= total - 1,
      any:
        creditNotes.length > 0 ||
        debitNotes.length > 0 ||
        adjustmentNotes.length > 0,
    };
  }
}
