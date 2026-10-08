import { OnEvent } from '@nestjs/event-emitter';
import { Invoice } from '../../shared/entities/invoice.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaidType } from '../../shared/entities/paidType.entity';
import {
  RESERVED_PAID_TYPE_CONDITION,
  RESERVED_PAID_TYPE_PARAMS,
} from '../../shared/constants/accommodationOccupancy.constant';
import { AccommodationRepository } from '../../shared/repositories/accommodation.repository';
import { InvoiceDetaillRepository } from '../../shared/repositories/invoiceDetaill.repository';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { InvoiceTypeRepository } from '../../shared/repositories/invoiceType.repository';
import { PaidTypeRepository } from '../../shared/repositories/paidType.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import {
  Notification,
  NotificationType,
} from '../../shared/entities/notification.entity';
import { User } from '../../shared/entities/user.entity';
import { OrdersGateway } from '../../socket/gateways/orders.gateway';
import { ConfigService } from '@nestjs/config';
import { MailsService } from '../../shared/services/mails.service';
import {
  ReservationMailStatus,
  ReservationMailTemplateService,
} from '../../shared/services/reservation-mail-template.service';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  PAID_TYPE_RESERVED_PAID,
  PAID_TYPE_RESERVED_PENDING,
  RESERVATION_HOLD_HOURS,
  RESERVATION_INVOICE_TYPE_CODE,
  RESERVATION_MAX_ACTIVE_PER_USER,
  RESERVATION_RELEASE_BATCH,
  RESERVATION_SOURCE_ONLINE,
  WEB_RESERVATION_USER_EMAIL,
} from '../constants/reservation.constants';
import { CreateReservationDto } from '../dtos/reservation.dto';
import { cleanFreeText, nightlyRate, planStay } from '../utils/reservation.utils';
import { InvoiceDetailService } from './invoiceDetail.service';
import { InvoiceService } from './invoice.service';

export interface CreatedReservation {
  invoiceId: number;
  code: string;
  total: number;
  nights: number;
  startDate: string;
  endDate: string;
  /** Hasta cuándo se retienen las fechas sin pago. */
  expiresAt: string;
}

const HOUR_MS = 60 * 60 * 1000;

/** Quién ve las solicitudes de reserva: quien las atiende en recepción. */
const RESERVATION_NOTIFY_ROLES = ['SUPERADMIN', 'ADMIN', 'EMP'];

/** `stateCode` de la pestaña "Reservaciones" de la campana de notificaciones. */
export const RESERVATION_NOTIFICATION_STATE = 'RSV';

/**
 * Filas devueltas por un `UPDATE ... RETURNING` hecho con `repository.query`.
 * Según la versión de TypeORM llega `rows` o `[rows, rowCount]`.
 */
const returnedRows = (result: unknown): any[] => {
  if (!Array.isArray(result)) return [];
  return Array.isArray(result[0]) ? result[0] : result;
};

/**
 * Reservas de estadía que hace el propio huésped.
 *
 * Una reserva sigue siendo una factura, y bloquea el calendario por su estado de
 * pago: `RES` (reservado, pendiente de pago) o `RES2` (reservado, pagado). El
 * huésped la crea en `RES` con un vencimiento; el personal confirma el pago
 * (`RES` → `RES2`) y, cuando exista pasarela, será su webhook quien llame al
 * mismo `confirmPayment`. Si vence sin pago, el cron libera las fechas.
 *
 * Qué NO se acepta del cliente: precio, impuestos, estado, tipo de factura,
 * empleado. Todo eso lo decide el servidor.
 *
 * Confirmar el pago y liberar por vencimiento son dos acciones que se pueden
 * cruzar. Las dos se deciden con un único `UPDATE` condicionado (Postgres
 * serializa las escrituras de una misma fila y reevalúa el `WHERE`), de modo que
 * una de las dos gana y la otra ve 0 filas afectadas. La marca es
 * `reservationExpiresAt`: liberar la pone en NULL al reclamar la fila, y
 * confirmar exige que una reserva ONLINE siga teniéndola.
 */
@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  /**
   * Facturas que se están borrando "por dentro" (vencimiento, o deshacer una
   * reserva que falló): el evento `invoice.deleted` NO debe avisar al huésped
   * de una cancelación en esos casos, porque ya se le avisa con su propio
   * mensaje o no llegó a existir para él.
   */
  private readonly _silentDeletes = new Set<number>();

  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
    private readonly _paidTypeRepository: PaidTypeRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _userRepository: UserRepository,
    private readonly _invoiceService: InvoiceService,
    private readonly _invoiceDetailService: InvoiceDetailService,
    private readonly _ordersGateway: OrdersGateway,
    private readonly _mailsService: MailsService,
    private readonly _mailTemplates: ReservationMailTemplateService,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _configService: ConfigService,
  ) {}

  /** Los estados se resuelven por `code`, nunca por id: difieren entre bases. */
  private async _paidTypeByCode(code: string): Promise<PaidType> {
    const paidType = await this._paidTypeRepository
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.code)) = :code', { code })
      .getOne();
    if (!paidType) {
      throw new InternalServerErrorException(
        `Falta el estado de pago "${code.toUpperCase()}" en el catálogo.`,
      );
    }
    return paidType;
  }

  private async _countOverlaps(
    accommodationId: number,
    startAt: string,
    endAt: string,
  ): Promise<number> {
    // Misma condición que `createMany` y el calendario público. Aquí solo sirve
    // para fallar ANTES de crear la factura; la comprobación que de verdad
    // cierra la carrera es la de `createMany`, bajo el lock del hospedaje.
    return this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .innerJoin('detail.invoice', 'invoice')
      .innerJoin('invoice.paidType', 'paidType')
      .where('detail.accommodation = :id', { id: accommodationId })
      .andWhere('detail.startDate < :end AND detail.endDate > :start', {
        start: startAt,
        end: endAt,
      })
      .andWhere('invoice.deletedAt IS NULL')
      .andWhere(RESERVED_PAID_TYPE_CONDITION, RESERVED_PAID_TYPE_PARAMS)
      .getCount();
  }

  async create(
    userId: string,
    dto: CreateReservationDto,
    now: Date = new Date(),
  ): Promise<CreatedReservation> {
    const plan = planStay(dto.startDate, dto.endDate, now);
    if (!plan.ok) throw new BadRequestException(plan.error);

    const user = await this._userRepository.findOne({
      where: { userId },
      relations: ['organizational'],
    });
    if (!user || !user.isActive) {
      throw new BadRequestException('Tu cuenta no está activa.');
    }
    // Sin teléfono y documento recepción no puede contactar ni facturar. No se
    // piden aquí: se completan en el perfil, que es donde viven.
    if (!user.phone?.trim() || !user.identificationNumber?.trim()) {
      throw new BadRequestException(
        'Completa tu teléfono y tu documento en el perfil antes de reservar.',
      );
    }

    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId: dto.accommodationId },
      relations: ['taxeType', 'organizational'],
    });
    if (!accommodation) throw new NotFoundException('Hospedaje no encontrado.');

    // El precio es SIEMPRE el del hospedaje (por noche, impuesto incluido): es
    // lo que muestra la web pública. Nunca el que mande el cliente.
    const basePrice = Number(accommodation.priceSale);
    if (!(basePrice > 0)) {
      throw new BadRequestException(
        'Este hospedaje no se puede reservar en línea. Comunícate con recepción.',
      );
    }
    const maxGuests = Number(accommodation.amountBathroom); // aforo máximo
    if (maxGuests > 0 && dto.guests > maxGuests) {
      throw new BadRequestException(
        `Este hospedaje admite como máximo ${maxGuests} huésped(es).`,
      );
    }

    // Los huéspedes por encima de los incluidos suman su valor por noche.
    const priceSale = nightlyRate(
      basePrice,
      Number(accommodation.extraPersonPrice),
      Number(accommodation.amountPerson),
      dto.guests,
    );

    const [invoiceType, pendingType] = await Promise.all([
      this._invoiceTypeRepository.findOne({
        where: { code: RESERVATION_INVOICE_TYPE_CODE },
      }),
      this._paidTypeByCode(PAID_TYPE_RESERVED_PENDING),
    ]);
    if (!invoiceType) {
      throw new InternalServerErrorException(
        `Falta el tipo de factura "${RESERVATION_INVOICE_TYPE_CODE}".`,
      );
    }

    // Tope de reservas sin pagar por usuario (anti-acaparamiento).
    const active = await this._invoiceRepository
      .createQueryBuilder('i')
      .innerJoin('i.user', 'u')
      .innerJoin('i.paidType', 'pt')
      .where('u.userId = :userId', { userId })
      .andWhere('i.reservationSource = :source', {
        source: RESERVATION_SOURCE_ONLINE,
      })
      .andWhere('pt.paidTypeId = :pendingId', {
        pendingId: pendingType.paidTypeId,
      })
      .andWhere('i.reservationExpiresAt > :now', { now })
      .getCount();
    if (active >= RESERVATION_MAX_ACTIVE_PER_USER) {
      throw new ConflictException(
        `Ya tienes ${active} reservas pendientes de pago. Paga o espera a que venzan antes de pedir otra.`,
      );
    }

    if (
      (await this._countOverlaps(dto.accommodationId, plan.startAt, plan.endAt)) >
      0
    ) {
      throw new ConflictException(
        'El hospedaje ya está reservado en esas fechas.',
      );
    }

    // Empleado de la factura: el usuario interno "RESERVACIÓN WEB". Si falta
    // (migración sin correr) la reserva sigue funcionando sin empleado y la
    // pantalla rotula el origen igual.
    const webUser = await this._userRepository.findOne({
      where: { email: WEB_RESERVATION_USER_EMAIL },
    });

    const observations = this._buildObservations(dto);
    const expiresAt = new Date(now.getTime() + RESERVATION_HOLD_HOURS * HOUR_MS);

    const invoice = await this._invoiceService.create(
      {
        invoiceTypeId: invoiceType.invoiceTypeId,
        userId,
        paidTypeId: pendingType.paidTypeId,
        invoiceElectronic: false,
        // La factura pertenece a la organización del hospedaje. Sin ella el
        // panel (que lista por la organización del personal) no la veía en
        // ninguna de sus vistas de facturas.
        organizationalId:
          accommodation.organizational?.organizationalId ??
          user.organizational?.organizationalId,
        observations,
        startDate: dto.startDate,
        endDate: dto.endDate,
        details: [],
      },
      webUser?.userId ?? null,
      {
        reservationSource: RESERVATION_SOURCE_ONLINE,
        reservationExpiresAt: expiresAt,
      },
    );

    try {
      // `createMany` repite la comprobación de solape bajo `FOR UPDATE` sobre el
      // hospedaje: si dos huéspedes piden lo mismo a la vez, gana uno.
      await this._invoiceDetailService.createMany(invoice.invoiceId, [
        {
          accommodationId: dto.accommodationId,
          amount: plan.nights,
          priceSale,
          taxeTypeId: accommodation.taxeType?.taxeTypeId,
          // El DTO los tipa como Date pero circulan como cadenas ISO, igual que
          // cuando los manda el formulario del recepcionista.
          startDate: plan.startAt as unknown as Date,
          endDate: plan.endAt as unknown as Date,
          // Nace SIN pagar (la columna es `true` por defecto): el pago lo
          // confirma el personal en `confirmPayment`.
          isPaid: false,
        },
      ]);
    } catch (error) {
      // La factura ya existía vacía: se deshace para no dejar una reserva sin
      // detalle que además gastaría un consecutivo.
      this._silentDeletes.add(invoice.invoiceId);
      await this._invoiceService
        .delete(invoice.invoiceId)
        .catch((e) => {
          this.logger.error(
            `No se pudo deshacer la factura ${invoice.invoiceId} tras fallar la reserva: ${e.message}`,
          );
        })
        .finally(() => this._silentDeletes.delete(invoice.invoiceId));
      throw error;
    }

    const saved = await this._invoiceRepository.findOne({
      where: { invoiceId: invoice.invoiceId },
    });

    const total = Number(saved?.total ?? 0);

    await this._notifyGuest(
      {
        userId,
        invoiceId: invoice.invoiceId,
        code: invoice.code,
        accommodationName: accommodation.name?.['es'] ?? '',
        startDate: dto.startDate,
        endDate: dto.endDate,
        email: user.email,
        guestName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        total,
        nights: plan.nights,
        guests: dto.guests,
        arrivalTime: dto.arrivalTime || undefined,
        expiresAt: expiresAt.toISOString(),
      },
      'PENDING',
    );

    await this._notifyStaff({
      invoiceId: invoice.invoiceId,
      code: invoice.code,
      guestName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      accommodationName: accommodation.name?.['es'] ?? '',
      startDate: dto.startDate,
      endDate: dto.endDate,
      nights: plan.nights,
      guests: dto.guests,
      total,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      invoiceId: invoice.invoiceId,
      code: invoice.code,
      total,
      nights: plan.nights,
      startDate: dto.startDate,
      endDate: dto.endDate,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Avisa al personal de la solicitud (pestaña "Reservaciones"): una notificación
   * guardada por usuario y el empuje en vivo por socket. La reserva ya está
   * creada, así que un fallo aquí se registra y NO la deshace ni se propaga al
   * huésped.
   */
  private async _notifyStaff(info: {
    invoiceId: number;
    code: string;
    guestName: string;
    accommodationName: string;
    startDate: string;
    endDate: string;
    nights: number;
    guests: number;
    total: number;
    expiresAt: string;
  }): Promise<void> {
    try {
      const manager = this._invoiceRepository.manager;
      const staff = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.roleType', 'roleType')
        // Alias camelCase entre comillas: en cadena cruda Postgres lo baja a
        // minúsculas (mismo caso que `_sendOrderNotification`).
        .where(`"roleType".code IN (:...roleCodes)`, {
          roleCodes: RESERVATION_NOTIFY_ROLES,
        })
        .getMany();
      if (staff.length === 0) return;

      const title = 'Nueva solicitud de reserva';
      const message =
        `${info.guestName || 'Un huésped'} pidió ${info.accommodationName} ` +
        `del ${info.startDate} al ${info.endDate} ` +
        `(${info.nights} noche${info.nights === 1 ? '' : 's'}, ` +
        `${info.guests} huésped${info.guests === 1 ? '' : 'es'}).`;

      const rows = staff.map((user) => {
        const notif = new Notification();
        notif.title = title;
        notif.message = message;
        notif.type = NotificationType.RESERVATION_REQUESTED;
        notif.user = user;
        notif.metadata = {
          stateCode: RESERVATION_NOTIFICATION_STATE,
          ...info,
        };
        return notif;
      });
      await manager.save(Notification, rows);

      for (const notif of rows) {
        this._ordersGateway.emitReservationToUser(notif.user.userId, {
          notificationId: notif.notificationId,
          title,
          message,
          createdAt: new Date(),
          stateCode: RESERVATION_NOTIFICATION_STATE,
          ...info,
        });
      }
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la reserva ${info.invoiceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /** Una reserva vencida y borrada no debe dejar su aviso apuntando a la nada. */
  private async _dropReservationNotifications(invoiceId: number): Promise<void> {
    try {
      await this._invoiceRepository.manager.query(
        `DELETE FROM "notifications"
          WHERE "type" = $1 AND "metadata"->>'invoiceId' = $2`,
        [NotificationType.RESERVATION_REQUESTED, String(invoiceId)],
      );
    } catch (error) {
      this.logger.warn(
        `No se pudieron limpiar los avisos de la reserva ${invoiceId}: ${error.message}`,
      );
    }
  }

  private _buildObservations(dto: CreateReservationDto): string {
    const parts = [
      'Reserva en línea',
      `Huéspedes: ${dto.guests}`,
      dto.arrivalTime ? `Llegada estimada: ${dto.arrivalTime}` : null,
    ];
    const notes = cleanFreeText(dto.notes, 200);
    if (notes) parts.push(`Notas: ${notes}`);
    return parts.filter(Boolean).join(' · ').slice(0, 500);
  }

  /**
   * RES → RES2 y quita el vencimiento. Lo llama el personal hoy y el webhook de
   * la pasarela mañana. Idempotente: confirmar una ya pagada no falla.
   */
  async confirmPayment(invoiceId: number): Promise<{ status: 'confirmed' | 'already-paid' }> {
    const [pending, paid] = await Promise.all([
      this._paidTypeByCode(PAID_TYPE_RESERVED_PENDING),
      this._paidTypeByCode(PAID_TYPE_RESERVED_PAID),
    ]);

    const result = await this._invoiceRepository.query(
      `UPDATE "Invoice"
          SET "paidTypeId" = $1, "reservationExpiresAt" = NULL, "updatedAt" = NOW()
        WHERE "invoiceId" = $2
          AND "deletedAt" IS NULL
          AND "paidTypeId" = $3
          AND ("reservationSource" IS DISTINCT FROM $4
               OR "reservationExpiresAt" IS NOT NULL)
        RETURNING "invoiceId"`,
      [
        paid.paidTypeId,
        invoiceId,
        pending.paidTypeId,
        RESERVATION_SOURCE_ONLINE,
      ],
    );
    if (returnedRows(result).length > 0) {
      await this._markOnlineDetailsPaid(invoiceId);
      await this._notifyGuest(await this._guestContext(invoiceId), 'APPROVED');
      return { status: 'confirmed' };
    }

    // 0 filas: se averigua por qué para dar un mensaje útil.
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['paidType'],
    });
    if (!invoice) throw new NotFoundException('Reserva no encontrada.');
    const code = invoice.paidType?.code?.trim().toLowerCase();
    if (code === PAID_TYPE_RESERVED_PAID) return { status: 'already-paid' };
    if (
      code === PAID_TYPE_RESERVED_PENDING &&
      invoice.reservationSource === RESERVATION_SOURCE_ONLINE
    ) {
      throw new ConflictException(
        'La reserva venció y sus fechas se están liberando.',
      );
    }
    throw new BadRequestException(
      'Esta factura no es una reserva pendiente de pago.',
    );
  }

  /**
   * Al confirmar el pago de una reserva EN LÍNEA, sus renglones (que nacieron sin
   * pagar) pasan a pagados y `paidTotal` los refleja, igual que hace
   * `togglePaymentStatus`. Las reservas que arma el personal no se tocan: sus
   * renglones ya se manejan a mano.
   */
  private async _markOnlineDetailsPaid(invoiceId: number): Promise<void> {
    await this._invoiceRepository.query(
      `UPDATE "InvoiceDetaill" SET "isPaid" = true
        WHERE "invoiceId" = $1
          AND EXISTS (SELECT 1 FROM "Invoice" i
                       WHERE i."invoiceId" = $1 AND i."reservationSource" = $2)`,
      [invoiceId, RESERVATION_SOURCE_ONLINE],
    );
    await this._invoiceRepository.query(
      `UPDATE "Invoice" i
          SET "paidTotal" = COALESCE((SELECT SUM(d."subtotal") FROM "InvoiceDetaill" d
                                       WHERE d."invoiceId" = i."invoiceId" AND d."isPaid" = true), 0)
        WHERE i."invoiceId" = $1 AND i."reservationSource" = $2`,
      [invoiceId, RESERVATION_SOURCE_ONLINE],
    );
  }

  /** Suma otro periodo de retención a una reserva online sin pagar. */
  async extendHold(
    invoiceId: number,
    now: Date = new Date(),
  ): Promise<{ expiresAt: string }> {
    const pending = await this._paidTypeByCode(PAID_TYPE_RESERVED_PENDING);
    const result = await this._invoiceRepository.query(
      `UPDATE "Invoice"
          SET "reservationExpiresAt" = GREATEST("reservationExpiresAt", $1::timestamp)
                                       + ($2 * INTERVAL '1 hour'),
              "updatedAt" = NOW()
        WHERE "invoiceId" = $3
          AND "deletedAt" IS NULL
          AND "reservationSource" = $4
          AND "reservationExpiresAt" IS NOT NULL
          AND "paidTypeId" = $5
        RETURNING "reservationExpiresAt"`,
      [
        now,
        RESERVATION_HOLD_HOURS,
        invoiceId,
        RESERVATION_SOURCE_ONLINE,
        pending.paidTypeId,
      ],
    );
    const rows = returnedRows(result);
    if (rows.length === 0) {
      throw new BadRequestException(
        'Solo se puede extender una reserva en línea pendiente de pago y vigente.',
      );
    }
    return { expiresAt: new Date(rows[0].reservationExpiresAt).toISOString() };
  }

  /**
   * Libera las reservas online que vencieron sin pago. Lo llama el cron.
   *
   * Cada una se RECLAMA con un `UPDATE` (vencimiento a NULL) antes de borrarla:
   * si el personal confirma el pago en ese instante, solo uno de los dos
   * `UPDATE` encuentra la fila en su estado y el otro se retira. Borrar usa el
   * mismo camino que el personal al cancelar una reserva (`InvoiceService.delete`:
   * devuelve el hospedaje a Disponible y recalcula el balance), así una reserva
   * vencida no queda contando como venta.
   */
  async releaseExpired(now: Date = new Date()): Promise<number> {
    const pending = await this._paidTypeByCode(PAID_TYPE_RESERVED_PENDING);

    const candidates = await this._invoiceRepository
      .createQueryBuilder('i')
      .select('i.invoiceId', 'invoiceId')
      .where('i.reservationSource = :source', {
        source: RESERVATION_SOURCE_ONLINE,
      })
      .andWhere('i.reservationExpiresAt < :now', { now })
      .andWhere('i.paidType = :pendingId', { pendingId: pending.paidTypeId })
      .andWhere('i.factusNumber IS NULL')
      .orderBy('i.reservationExpiresAt', 'ASC')
      .limit(RESERVATION_RELEASE_BATCH)
      .getRawMany<{ invoiceId: number }>();

    let released = 0;
    for (const { invoiceId } of candidates) {
      const claimed = returnedRows(
        await this._invoiceRepository.query(
          `UPDATE "Invoice"
              SET "reservationExpiresAt" = NULL, "updatedAt" = NOW()
            WHERE "invoiceId" = $1
              AND "deletedAt" IS NULL
              AND "reservationSource" = $2
              AND "reservationExpiresAt" < $3::timestamp
              AND "paidTypeId" = $4
            RETURNING "invoiceId"`,
          [invoiceId, RESERVATION_SOURCE_ONLINE, now, pending.paidTypeId],
        ),
      );
      if (claimed.length === 0) continue; // la pagaron o la tocaron: no se libera

      // El contexto del huésped se lee ANTES de borrar: después la fila no existe.
      const guest = await this._guestContext(invoiceId);
      this._silentDeletes.add(invoiceId);
      try {
        await this._invoiceService.delete(invoiceId);
        await this._dropReservationNotifications(invoiceId);
        await this._notifyGuest(guest, 'EXPIRED');
        released++;
        this.logger.log(`Reserva ${invoiceId} vencida sin pago: fechas liberadas.`);
      } catch (error) {
        // Sin esto quedaría con vencimiento NULL y el estado RES: bloquearía el
        // calendario para siempre. Se devuelve el vencimiento (ya vencido) y el
        // cron la reintenta en la próxima pasada.
        await this._invoiceRepository.query(
          `UPDATE "Invoice" SET "reservationExpiresAt" = $2::timestamp WHERE "invoiceId" = $1`,
          [invoiceId, now],
        );
        this.logger.error(
          `No se pudo liberar la reserva ${invoiceId}: ${error.message}`,
          error.stack,
        );
      } finally {
        this._silentDeletes.delete(invoiceId);
      }
    }
    return released;
  }

  // ── Avisos al huésped ────────────────────────────────────────────────────

  /** Día calendario local (`YYYY-MM-DD`) de un timestamp sin zona horaria. */
  private _day(value?: Date | string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Datos del huésped y de la estadía; `null` si no es una reserva en línea. */
  private _contextOf(invoice: Invoice | null): GuestContext | null {
    if (
      !invoice ||
      invoice.reservationSource !== RESERVATION_SOURCE_ONLINE ||
      !invoice.user?.userId
    ) {
      return null;
    }
    const stay = (invoice.invoiceDetails ?? []).find((d) => d.accommodation);
    // Huéspedes y hora de llegada no tienen columna: viajan en las observaciones
    // que arma `_buildObservations`.
    const obs = invoice.observations ?? '';
    return {
      userId: invoice.user.userId,
      invoiceId: invoice.invoiceId,
      code: invoice.code,
      accommodationName: stay?.accommodation?.name?.['es'] ?? '',
      startDate: this._day(stay?.startDate),
      endDate: this._day(stay?.endDate),
      email: invoice.user.email,
      guestName: `${invoice.user.firstName ?? ''} ${invoice.user.lastName ?? ''}`.trim(),
      total: Number(invoice.total ?? 0),
      nights: stay ? Number(stay.amount) : undefined,
      guests: Number(/Huéspedes:\s*(\d+)/.exec(obs)?.[1]) || undefined,
      arrivalTime: /Llegada estimada:\s*([0-9:]+)/.exec(obs)?.[1],
      expiresAt: invoice.reservationExpiresAt?.toISOString?.(),
      wasApproved: invoice.paidType?.code?.trim().toLowerCase() === 'res2',
    };
  }

  private async _guestContext(invoiceId: number): Promise<GuestContext | null> {
    try {
      return this._contextOf(
        await this._invoiceRepository.findOne({
          where: { invoiceId },
          relations: [
            'user',
            'paidType',
            'invoiceDetails',
            'invoiceDetails.accommodation',
          ],
        }),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo leer la reserva ${invoiceId} para avisar al huésped: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Una reserva en línea que el personal cancela (borra la factura) también le
   * llega al huésped como "no aceptada". Se excluyen los borrados internos
   * (`_silentDeletes`): vencimiento y reserva que falló al crearse.
   */
  @OnEvent('invoice.deleted', { async: true })
  async handleInvoiceDeleted(payload: { invoice: Invoice }): Promise<void> {
    const invoice = payload?.invoice;
    if (!invoice || this._silentDeletes.has(invoice.invoiceId)) return;
    await this._notifyGuest(this._contextOf(invoice), 'CANCELLED');
  }

  /**
   * Avisa al huésped el estado de su reserva: aprobada, vencida sin pago o no
   * aceptada. Mismo criterio que `_notifyStaff`: un fallo se registra y no
   * propaga, porque lo importante (confirmar o liberar) ya ocurrió.
   */
  private async _notifyGuest(
    ctx: GuestContext | null,
    status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'CANCELLED',
  ): Promise<void> {
    if (!ctx) return;
    // Sin `await`: el SMTP tarda segundos y no debe retener la petición del
    // huésped ni el cron que libera hasta 50 reservas. `_emailGuest` captura sus
    // propios errores, así que no queda ninguna promesa sin manejar.
    void this._emailGuest(
      ctx,
      status === 'CANCELLED'
        ? ctx.wasApproved
          ? 'CANCELLED'
          : 'REJECTED'
        : status,
    );
    try {
      const stay =
        `${ctx.accommodationName} del ${ctx.startDate} al ${ctx.endDate}`.trim();
      const copy = {
        PENDING: {
          title: 'Reserva en espera',
          message: `Recibimos tu solicitud ${ctx.code} (${stay}). Está en espera de aprobación: te avisaremos aquí apenas la revisemos.`,
        },
        APPROVED: {
          title: 'Estadía aprobada',
          message: `¡Tu reserva ${ctx.code} fue aprobada! ${stay}. Te esperamos.`,
        },
        EXPIRED: {
          title: 'Reserva vencida',
          message: `Tu reserva ${ctx.code} (${stay}) venció sin recibir el pago y las fechas quedaron libres. Puedes volver a reservar.`,
        },
        CANCELLED: ctx.wasApproved
          ? {
              title: 'Reserva cancelada',
              message: `Tu reserva ${ctx.code} (${stay}) fue cancelada. Si tienes dudas, escríbenos por WhatsApp.`,
            }
          : {
              title: 'Reserva no aceptada',
              message: `Tu reserva ${ctx.code} (${stay}) no fue aceptada. Si tienes dudas, escríbenos por WhatsApp.`,
            },
      }[status];

      const notif = new Notification();
      notif.title = copy.title;
      notif.message = copy.message;
      notif.type = NotificationType.RESERVATION_STATUS;
      notif.user = { userId: ctx.userId } as User;
      notif.metadata = {
        kind: 'RESERVATION_STATUS',
        status,
        wasApproved: ctx.wasApproved ?? false,
        invoiceId: ctx.invoiceId,
        code: ctx.code,
        accommodationName: ctx.accommodationName,
        startDate: ctx.startDate,
        endDate: ctx.endDate,
      };
      await this._invoiceRepository.manager.save(Notification, notif);

      this._ordersGateway.emitGuestNotification(ctx.userId, {
        notificationId: notif.notificationId,
        title: notif.title,
        message: notif.message,
        read: false,
        type: notif.type,
        metadata: notif.metadata,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo avisar al huésped de la reserva ${ctx.invoiceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Correo al huésped con el estado de su reserva (en espera, aprobada, no
   * aceptada, vencida). Un fallo —SMTP caído, sin correo— se registra y no
   * afecta a la reserva ni al aviso dentro de la app.
   */
  private async _emailGuest(
    ctx: GuestContext,
    status: ReservationMailStatus,
  ): Promise<void> {
    if (!ctx.email) return;
    try {
      const org = await this._organizationalRepository.findOne({
        where: {},
        relations: ['medias', 'medias.mediaType'],
      });
      const frontendUrl =
        this._configService.get<string>('APP_FRONTEND_URL') ||
        'https://ecohotelsamawe.com';
      // Solo en espera y aprobada la reserva sigue existiendo para abrirla.
      const detailUrl = ['PENDING', 'APPROVED'].includes(status)
        ? `${frontendUrl}/es/user/invoices/${ctx.invoiceId}`
        : undefined;

      const { deliveredTo } = await this._mailsService.sendEmail({
        to: ctx.email,
        subject: this._mailTemplates.subject(status, ctx.code),
        body: this._mailTemplates.build(
          status,
          {
            guestName: ctx.guestName ?? '',
            code: ctx.code,
            accommodationName: ctx.accommodationName,
            startDate: ctx.startDate,
            endDate: ctx.endDate,
            nights: ctx.nights,
            guests: ctx.guests,
            total: ctx.total,
            arrivalTime: ctx.arrivalTime,
            expiresAt: status === 'PENDING' ? ctx.expiresAt : undefined,
            detailUrl,
          },
          org,
        ),
      });
      this.logger.log(
        `Correo de reserva ${ctx.invoiceId} (${status}) entregado a ${deliveredTo}.`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de la reserva ${ctx.invoiceId} (${status}): ${error.message}`,
      );
    }
  }
}

interface GuestContext {
  userId: string;
  invoiceId: number;
  code: string;
  accommodationName: string;
  startDate: string;
  endDate: string;
  // Para el correo
  email?: string;
  guestName?: string;
  total?: number;
  nights?: number;
  guests?: number;
  arrivalTime?: string;
  expiresAt?: string;
  /** Se cancela una reserva que ya estaba aprobada (no "no aceptada"). */
  wasApproved?: boolean;
}
