import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import { Organizational } from '../../shared/entities/organizational.entity';
import { FactusBillsService } from './factus-bills.service';
import {
  FactusDocumentKind,
  FactusNumberingRangeOverview,
} from '../interfaces/bill.interfaces';

/** Qué rango usa cada documento, tal como está guardado. */
export interface FactusRangeSelection {
  sales: number | null;
  creditNote: number | null;
  debitNote: number | null;
  supportDocument: number | null;
  adjustmentNote: number | null;
}

/** Los cinco documentos, en el orden en que se muestran. */
const DOCUMENT_KINDS: FactusDocumentKind[] = [
  'sales',
  'creditNote',
  'debitNote',
  'supportDocument',
  'adjustmentNote',
];

export interface FactusNumberingOverview {
  ranges: FactusNumberingRangeOverview[];
  selection: FactusRangeSelection;
  /**
   * Rango que se usaría AHORA MISMO para cada documento: el elegido si sigue
   * siendo válido, o el auto-resuelto. Es lo que evita la sorpresa de creer que
   * se emite con un rango y estar emitiendo con otro.
   */
  effective: FactusRangeSelection;
}

/** Columna de `Organizational` donde vive la selección de cada documento. */
const SELECTION_COLUMN: Record<FactusDocumentKind, keyof Organizational> = {
  sales: 'factusNumberingRangeId',
  creditNote: 'factusNumberingRangeIdCreditNote',
  debitNote: 'factusNumberingRangeIdDebitNote',
  supportDocument: 'factusNumberingRangeIdSupport',
  adjustmentNote: 'factusNumberingRangeIdAdjustment',
};

/**
 * Configuración de numeración DIAN. Los datos del rango (consecutivo, vigencia,
 * resolución) se leen SIEMPRE en vivo de Factus, que es su fuente de verdad; en
 * la base solo se guarda cuál de esos rangos usa cada documento. Espejar el
 * consecutivo localmente daría un número que miente en cuanto alguien emita
 * desde el portal de Factus.
 */
@Injectable()
export class FactusNumberingService {
  private readonly logger = new Logger(FactusNumberingService.name);

  constructor(
    private readonly billsService: FactusBillsService,
    private readonly organizationalRepository: OrganizationalRepository,
  ) {}

  async getOverview(
    organizationalId?: string,
  ): Promise<FactusNumberingOverview> {
    const org = await this.resolveOrganizational(organizationalId);
    const ranges = await this.billsService.getRangesOverview();

    const selection = {} as FactusRangeSelection;
    const effective = {} as FactusRangeSelection;
    for (const kind of DOCUMENT_KINDS) {
      const saved = (org?.[SELECTION_COLUMN[kind]] as number | undefined) ?? null;
      selection[kind] = saved;
      // El efectivo se calcula con la misma lógica que la emisión, pero sin
      // reventar: si no hay rango usable para un documento, queda en null y la
      // vista lo muestra como pendiente en vez de romper la pantalla entera.
      effective[kind] = this.resolveEffective(ranges, kind, saved);
    }

    return { ranges, selection, effective };
  }

  /**
   * Fija el rango de uno o varios documentos. Se valida contra los rangos
   * reales de Factus: sin esto se podría guardar un id inexistente —como el
   * 2621 de sandbox que quedó en la base de producción— y el sistema seguiría
   * emitiendo con otro rango sin avisar.
   */
  async updateSelection(
    changes: Partial<Record<FactusDocumentKind, number | null>>,
    organizationalId?: string,
  ): Promise<FactusNumberingOverview> {
    const org = await this.resolveOrganizational(organizationalId);
    if (!org) {
      throw new BadRequestException(
        'No hay una organización configurada donde guardar la numeración.',
      );
    }

    const ranges = await this.billsService.getRangesOverview();

    for (const [kind, rangeId] of Object.entries(changes) as [
      FactusDocumentKind,
      number | null | undefined,
    ][]) {
      if (rangeId === undefined) continue;

      if (rangeId !== null) {
        const range = ranges.find((r) => r.id === rangeId);
        if (!range) {
          throw new BadRequestException(
            `El rango ${rangeId} no existe en esta cuenta de Factus.`,
          );
        }
        if (range.kind !== kind) {
          throw new BadRequestException(
            `El rango ${rangeId} es de "${range.documentName}" (prefijo ${range.prefix}) ` +
              `y se está intentando usar para otro documento. Elegir un rango del ` +
              'tipo equivocado haría que los documentos salieran numerados con el ' +
              'consecutivo de otra resolución.',
          );
        }
        if (range.status === 'expired') {
          throw new BadRequestException(
            `El rango ${rangeId} (prefijo ${range.prefix}) está VENCIDO` +
              `${range.endDate ? ` desde ${range.endDate}` : ''}. No se puede fijar.`,
          );
        }
      }

      (org as any)[SELECTION_COLUMN[kind]] = rangeId ?? null;
      this.logger.log(
        `Numeración de "${kind}" fijada al rango ${rangeId ?? '(automático)'}.`,
      );
    }

    await this.organizationalRepository.save(org);
    return this.getOverview(org.organizationalId);
  }

  /**
   * Mismo criterio que `resolveNumberingRangeId`: respeta el elegido si sigue
   * siendo usable; si no, el primer activo y no vencido del tipo.
   */
  private resolveEffective(
    ranges: FactusNumberingRangeOverview[],
    kind: FactusDocumentKind,
    preferredId: number | null,
  ): number | null {
    const usable = ranges.filter(
      (r) => r.kind === kind && r.isActive && !r.isExpired,
    );
    if (preferredId && usable.some((r) => r.id === preferredId)) {
      return preferredId;
    }
    return usable[0]?.id ?? null;
  }

  private async resolveOrganizational(
    organizationalId?: string,
  ): Promise<Organizational | null> {
    if (organizationalId) {
      return this.organizationalRepository.findOne({
        where: { organizationalId },
      });
    }
    // Instalación de una sola organización: se toma la que haya.
    const [first] = await this.organizationalRepository.find({ take: 1 });
    return first ?? null;
  }
}
