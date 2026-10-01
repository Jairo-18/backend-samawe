import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike } from 'typeorm';
import { Invoice } from '../../shared/entities/invoice.entity';
import { InvoicePayment } from '../../shared/entities/invoicePayment.entity';
import { PaidType } from '../../shared/entities/paidType.entity';
import { PayType } from '../../shared/entities/payType.entity';
import { User } from '../../shared/entities/user.entity';
import {
  CreateInvoicePaymentDto,
  SetInvoiceCreditDto,
} from '../dtos/invoiceCredit.dto';
import {
  addDays,
  buildCreditSummary,
  CreditSummary,
} from '../utils/credit-schedule.utils';

const CREDIT_PAY_TYPE_CODE = 'CRE';

/**
 * Estado de pago de la factura según su saldo. Se mapean pares, no un valor
 * único, porque una factura con reserva de hospedaje tiene RES / RES2
 * ("RESERVADO - PENDIENTE / PAGADO") y convertirla en PAG la dejaría sin
 * reserva a ojos del buscador de disponibilidad. Cualquier otro estado (p. ej.
 * NA) no se toca.
 */
const PAID_WHEN_SETTLED: Record<string, string> = { PEN: 'PAG', RES: 'RES2' };
const PENDING_WHEN_REOPENED: Record<string, string> = { PAG: 'PEN', RES2: 'RES' };

/** Hoy en Colombia (YYYY-MM-DD); en UTC a las 7 pm ya sería "mañana". */
const todayBogota = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
    new Date(),
  );

export interface InvoiceCreditView extends CreditSummary {
  invoiceId: number;
  /**
   * `total` (heredado) es lo que realmente se debe pagar: el de la factura MÁS
   * notas débito MENOS notas crédito. Aquí van las dos piezas para mostrarlo.
   */
  invoiceTotal: number;
  /** Notas débito − notas crédito (positivo sube lo que se debe, negativo lo baja). */
  notesNet: number;
  /** Lo abonado por encima de lo que se debe tras las notas (a favor del cliente). */
  overpaid: number;
  creditDays: number | null;
  creditStartDate: string | null;
  dueDate: string | null;
  payments: Array<{
    invoicePaymentId: number;
    amount: number;
    paidAt: string;
    note: string | null;
    payTypeId: number | null;
  }>;
}

export interface ReceivableRow {
  invoiceId: number;
  code: string;
  factusNumber: string | null;
  clientName: string;
  clientIdentification: string;
  total: number;
  paid: number;
  balance: number;
  creditDays: number | null;
  dueDate: string | null;
  /** Primera cuota vencida sin pagar (`null` si no hay), para ordenar y avisar. */
  oldestOverdueDate: string | null;
  status: CreditSummary['status'] | 'NO_TERM';
}

/**
 * Cartera de las facturas a crédito: plazo (30/60/90), cuotas derivadas y
 * abonos. Es control interno de samawe; a la DIAN solo llega el vencimiento
 * final (`Invoice.dueDate`) cuando la factura se emite electrónicamente.
 */
@Injectable()
export class InvoiceCreditService {
  constructor(@InjectDataSource() private readonly _dataSource: DataSource) {}

  async getCredit(invoiceId: number): Promise<InvoiceCreditView> {
    return this._buildView(this._dataSource.manager, invoiceId);
  }

  /**
   * Define (o redefine) el plazo. El plazo cuenta desde hoy. No se puede
   * cambiar una vez la factura está validada por la DIAN: el vencimiento ya
   * viajó en el documento.
   */
  async setCredit(
    invoiceId: number,
    dto: SetInvoiceCreditDto,
  ): Promise<InvoiceCreditView> {
    return this._dataSource.transaction(async (manager) => {
      const invoice = await this._lockInvoice(manager, invoiceId);
      this._assertCredit(invoice);
      if (invoice.factusNumber) {
        throw new ConflictException(
          'La factura ya fue validada por la DIAN con su vencimiento; el plazo ya no se puede cambiar.',
        );
      }
      const start = todayBogota();
      await manager.update(
        Invoice,
        { invoiceId },
        {
          creditDays: dto.creditDays,
          creditStartDate: start,
          dueDate: addDays(start, dto.creditDays),
        },
      );
      return this._buildView(manager, invoiceId);
    });
  }

  async addPayment(
    invoiceId: number,
    dto: CreateInvoicePaymentDto,
    employeeId: string,
  ): Promise<InvoiceCreditView> {
    return this._dataSource.transaction(async (manager) => {
      // El lock de la fila evita que dos abonos simultáneos pasen ambos el
      // chequeo de saldo y sobrepaguen la factura.
      const invoice = await this._lockInvoice(manager, invoiceId);
      this._assertCredit(invoice);
      if (!invoice.creditDays || !invoice.creditStartDate) {
        throw new BadRequestException(
          'Defina el plazo de crédito (30, 60 o 90 días) antes de registrar abonos.',
        );
      }

      const today = todayBogota();
      const paidAt = dto.paidAt ?? today;
      if (paidAt > today) {
        throw new BadRequestException(
          'La fecha del abono no puede ser futura.',
        );
      }

      if (dto.payTypeId !== undefined) {
        const payType = await manager.findOne(PayType, {
          where: { payTypeId: dto.payTypeId },
        });
        if (!payType) throw new BadRequestException('Tipo de pago no válido.');
        if (payType.code === CREDIT_PAY_TYPE_CODE) {
          throw new BadRequestException(
            'Un abono no puede registrarse con el medio "crédito".',
          );
        }
      }

      const { balance } = await this._buildView(manager, invoiceId);
      if (dto.amount > balance + 0.001) {
        throw new BadRequestException(
          `El abono (${dto.amount}) supera el saldo pendiente (${balance}).`,
        );
      }

      await manager.save(
        InvoicePayment,
        manager.create(InvoicePayment, {
          invoice: { invoiceId } as Invoice,
          amount: dto.amount,
          payType: dto.payTypeId
            ? ({ payTypeId: dto.payTypeId } as PayType)
            : undefined,
          paidAt,
          note: dto.note,
          employee: { userId: employeeId } as User,
        }),
      );
      return this._syncPaidType(manager, invoiceId);
    });
  }

  async deletePayment(
    invoiceId: number,
    invoicePaymentId: number,
  ): Promise<InvoiceCreditView> {
    return this._dataSource.transaction(async (manager) => {
      await this._lockInvoice(manager, invoiceId);
      const result = await manager
        .createQueryBuilder()
        .delete()
        .from(InvoicePayment)
        .where(
          '"invoicePaymentId" = :invoicePaymentId AND "invoiceId" = :invoiceId',
          { invoicePaymentId, invoiceId },
        )
        .execute();
      if (!result.affected) throw new NotFoundException('Abono no encontrado.');
      return this._syncPaidType(manager, invoiceId);
    });
  }

  /**
   * Cuentas por cobrar: facturas de venta a crédito con su saldo. Por defecto
   * solo las que aún deben algo; `includePaid` agrega las saldadas. Las que no
   * tienen plazo definido salen como `NO_TERM` (hay que fijarlo antes de
   * abonar o emitir).
   */
  async listReceivables(includePaid = false): Promise<ReceivableRow[]> {
    const rows: Array<{
      invoiceId: number;
      code: string;
      factusNumber: string | null;
      total: string;
      creditDays: number | null;
      creditStartDate: string | null;
      dueDate: string | null;
      firstName: string;
      lastName: string;
      identificationNumber: string;
    }> = await this._dataSource.query(
      `SELECT i."invoiceId", i."code", i."factusNumber", i."total", i."creditDays",
              i."creditStartDate"::text AS "creditStartDate", i."dueDate"::text AS "dueDate",
              u."firstName", u."lastName", u."identificationNumber"
         FROM "Invoice" i
         JOIN "PayType" p ON p."payTypeId" = i."payTypeId"
         JOIN "InvoiceType" t ON t."invoiceTypeId" = i."invoiceTypeId"
         LEFT JOIN "User" u ON u."userId" = i."userId"
        WHERE p."code" = $1 AND t."code" IN ('FV', 'FVE') AND i."deletedAt" IS NULL`,
      [CREDIT_PAY_TYPE_CODE],
    );
    const paymentRows: Array<{ invoiceId: number; amount: string }> =
      await this._dataSource.query(
        `SELECT "invoiceId", "amount" FROM "InvoicePayment" ORDER BY "paidAt", "invoicePaymentId"`,
      );
    const paymentsByInvoice = new Map<number, number[]>();
    for (const r of paymentRows) {
      const list = paymentsByInvoice.get(r.invoiceId) ?? [];
      list.push(Number(r.amount));
      paymentsByInvoice.set(r.invoiceId, list);
    }

    // Notas por factura (débito − crédito) para que el saldo sea el neto.
    const noteRows: Array<{ invoiceId: number; net: string }> =
      await this._dataSource.query(
        `SELECT n."invoiceId", SUM(n."delta") AS "net" FROM (
           SELECT "invoiceId", "total" AS "delta" FROM "DebitNote"
           UNION ALL
           SELECT "invoiceId", -"total" AS "delta" FROM "CreditNote"
         ) n GROUP BY n."invoiceId"`,
      );
    const notesByInvoice = new Map(
      noteRows.map((n) => [n.invoiceId, Number(n.net)]),
    );

    const today = todayBogota();
    const result: ReceivableRow[] = [];
    for (const r of rows) {
      const total = Math.max(
        Math.round((Number(r.total) + (notesByInvoice.get(r.invoiceId) ?? 0)) * 100) / 100,
        0,
      );
      const payments = paymentsByInvoice.get(r.invoiceId) ?? [];
      const hasTerm = !!r.creditDays && !!r.creditStartDate;
      const summary = hasTerm
        ? buildCreditSummary(total, r.creditDays!, r.creditStartDate!, payments, today)
        : null;
      const paid = summary?.paid ?? payments.reduce((a, b) => a + b, 0);
      const balance = summary?.balance ?? Math.max(total - paid, 0);
      const status: ReceivableRow['status'] = summary ? summary.status : 'NO_TERM';
      if (!includePaid && balance <= 0) continue;
      result.push({
        invoiceId: r.invoiceId,
        code: r.code,
        factusNumber: r.factusNumber,
        clientName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
        clientIdentification: r.identificationNumber ?? '',
        total,
        paid,
        balance,
        creditDays: r.creditDays,
        dueDate: r.dueDate,
        oldestOverdueDate:
          summary?.installments.find((i) => i.status === 'OVERDUE')?.dueDate ?? null,
        status,
      });
    }

    // Vencidas primero (la más atrasada arriba), luego por vencimiento.
    const rank = (x: ReceivableRow) =>
      x.status === 'OVERDUE' ? 0 : x.status === 'NO_TERM' ? 1 : 2;
    return result.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.oldestOverdueDate ?? a.dueDate ?? '9999').localeCompare(
          b.oldestOverdueDate ?? b.dueDate ?? '9999',
        ),
    );
  }

  private async _lockInvoice(
    manager: EntityManager,
    invoiceId: number,
  ): Promise<Invoice> {
    // El lock va sin relaciones: Postgres no permite FOR UPDATE sobre el lado
    // nullable de un LEFT JOIN. El payType se lee aparte.
    const locked = await manager.findOne(Invoice, {
      where: { invoiceId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw new NotFoundException('Factura no encontrada.');
    const withType = await manager.findOne(Invoice, {
      where: { invoiceId },
      relations: ['payType'],
    });
    return withType ?? locked;
  }

  private _assertCredit(invoice: Invoice): void {
    if (invoice.payType?.code !== CREDIT_PAY_TYPE_CODE) {
      throw new BadRequestException(
        'La factura no es a crédito: cambie el medio de pago a "crédito" primero.',
      );
    }
  }

  /**
   * Mantiene el "Estado de pago" de la factura coherente con la cartera: al
   * llegar el saldo a cero pasa a pagado, y si se borra un abono y vuelve a
   * deber algo, regresa a pendiente. Corre dentro de la misma transacción que
   * el abono, así nunca queda un estado a medias.
   */
  private async _syncPaidType(
    manager: EntityManager,
    invoiceId: number,
  ): Promise<InvoiceCreditView> {
    const view = await this._buildView(manager, invoiceId);
    const invoice = await manager.findOne(Invoice, {
      where: { invoiceId },
      relations: ['paidType'],
    });
    const current = invoice?.paidType?.code?.toUpperCase();
    if (!invoice || !current) return view;

    // "Saldada" exige haber abonado algo: una factura anulada por nota crédito
    // sin abonos tiene saldo 0 pero no está pagada.
    const targetCode =
      view.balance <= 0
        ? view.paid > 0
          ? PAID_WHEN_SETTLED[current]
          : undefined
        : PENDING_WHEN_REOPENED[current];
    if (!targetCode) return view;

    const target = await manager.findOne(PaidType, {
      where: { code: ILike(targetCode) },
    });
    if (target) {
      await manager.update(
        Invoice,
        { invoiceId },
        { paidType: { paidTypeId: target.paidTypeId } as PaidType },
      );
    }
    return view;
  }

  /** Notas débito − notas crédito de una factura (positivo = debe más). */
  private async _notesNet(
    manager: EntityManager,
    invoiceId: number,
  ): Promise<number> {
    const [row] = await manager.query(
      `SELECT (SELECT COALESCE(SUM("total"), 0) FROM "DebitNote" WHERE "invoiceId" = $1)
            - (SELECT COALESCE(SUM("total"), 0) FROM "CreditNote" WHERE "invoiceId" = $1) AS "net"`,
      [invoiceId],
    );
    return Number(row?.net ?? 0);
  }

  private async _buildView(
    manager: EntityManager,
    invoiceId: number,
  ): Promise<InvoiceCreditView> {
    const invoice = await manager.findOne(Invoice, { where: { invoiceId } });
    if (!invoice) throw new NotFoundException('Factura no encontrada.');
    const payments = await manager.find(InvoicePayment, {
      where: { invoice: { invoiceId } },
      relations: ['payType'],
      order: { paidAt: 'ASC', invoicePaymentId: 'ASC' },
    });

    const invoiceTotal = Number(invoice.total);
    const notesNet = await this._notesNet(manager, invoiceId);
    // Lo que se debe: las notas crédito (devoluciones/anulaciones) lo bajan y
    // las débito lo suben. Sin esto, una factura anulada seguía "por cobrar".
    const total = Math.max(Math.round((invoiceTotal + notesNet) * 100) / 100, 0);
    const creditDays = invoice.creditDays ?? null;
    const start = invoice.creditStartDate ?? null;
    const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const summary: CreditSummary =
      creditDays && start
        ? buildCreditSummary(
            total,
            creditDays,
            start,
            payments.map((p) => Number(p.amount)),
            todayBogota(),
          )
        : {
            total,
            paid,
            balance: Math.max(total - paid, 0),
            status: 'PENDING',
            installments: [],
          };

    return {
      invoiceId,
      creditDays,
      creditStartDate: start,
      dueDate: invoice.dueDate ?? null,
      ...summary,
      invoiceTotal,
      notesNet,
      overpaid: Math.max(Math.round((paid - total) * 100) / 100, 0),
      payments: payments.map((p) => ({
        invoicePaymentId: p.invoicePaymentId,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        note: p.note ?? null,
        payTypeId: p.payType?.payTypeId ?? null,
      })),
    };
  }
}
