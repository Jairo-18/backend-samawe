import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';

// `invoiceDetail.service` importa con ruta absoluta (`src/socket/...`), que Jest
// no resuelve, y aquí los dos servicios solo son dependencias inyectadas que el
// test reemplaza por dobles: no hace falta cargar su código real.
jest.mock('./invoiceDetail.service', () => ({ InvoiceDetailService: class {} }));
jest.mock('./invoice.service', () => ({ InvoiceService: class {} }));

/**
 * El servicio se prueba sin base de datos: repositorios falsos que devuelven lo
 * que devolvería la consulta. Lo que se verifica son las REGLAS: qué se rechaza
 * y con qué, que el precio salga del servidor, que una reserva fallida se deshaga
 * y que confirmar el pago y liberar por vencimiento no puedan pisarse.
 */

// Entrada 2026-10-12, salida 2026-10-14 (2 noches). Hoy: 2026-10-10 en Colombia.
const NOW = new Date('2026-10-10T20:00:00.000Z');

const ACCOMMODATION = {
  accommodationId: 6,
  priceSale: '150000.00',
  amountBathroom: 4,
  taxeType: { taxeTypeId: 2 },
};

const USER = {
  userId: 'u-1',
  isActive: true,
  phone: '3001234567',
  identificationNumber: '123456',
  email: 'huesped@test.co',
  firstName: 'Ana',
  lastName: 'Gómez',
};

const DTO = {
  accommodationId: 6,
  startDate: '2026-10-12',
  endDate: '2026-10-14',
  guests: 2,
  arrivalTime: '16:30',
  notes: 'Cama extra',
};

/** Constructor de consultas encadenable cuyo remate devuelve lo configurado. */
const qb = (terminal: Record<string, unknown>) => {
  const b: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop in terminal) {
          const v = terminal[prop];
          return typeof v === 'function' ? v : async () => v;
        }
        return () => b;
      },
    },
  );
  return b;
};

interface Overrides {
  user?: unknown;
  accommodation?: unknown;
  invoiceType?: unknown;
  activeCount?: number;
  overlapCount?: number;
  createManyError?: Error;
  /** Respuestas sucesivas de `invoiceRepository.query`. */
  queries?: unknown[];
  savedInvoice?: unknown;
  candidates?: { invoiceId: number }[];
  deleteError?: Error;
}

const make = (o: Overrides = {}) => {
  const queries = [...(o.queries ?? [])];
  const invoiceRepo: any = {
    createQueryBuilder: jest.fn(() =>
      qb({ getCount: o.activeCount ?? 0, getRawMany: o.candidates ?? [] }),
    ),
    findOne: jest.fn(async () =>
      o.savedInvoice === undefined ? { total: '300000.00' } : o.savedInvoice,
    ),
    query: jest.fn(async () => (queries.length ? queries.shift() : [[], 0])),
  };
  const invoiceTypeRepo: any = {
    findOne: jest.fn(async () =>
      o.invoiceType === undefined ? { invoiceTypeId: 3 } : o.invoiceType,
    ),
  };
  const paidTypeRepo: any = {
    createQueryBuilder: jest.fn(() => {
      let code = '';
      const b: any = {
        where: (_s: string, p: { code: string }) => {
          code = p.code;
          return b;
        },
        getOne: async () => ({ paidTypeId: code === 'res' ? 10 : 11, code }),
      };
      return b;
    }),
  };
  const accommodationRepo: any = {
    findOne: jest.fn(async () =>
      o.accommodation === undefined ? ACCOMMODATION : o.accommodation,
    ),
  };
  const detailRepo: any = {
    createQueryBuilder: jest.fn(() => qb({ getCount: o.overlapCount ?? 0 })),
  };
  const userRepo: any = {
    findOne: jest.fn(async (q: any) =>
      q?.where?.email === 'reservacion.web@samawe.internal'
        ? { userId: 'web-user' }
        : o.user === undefined
          ? USER
          : o.user,
    ),
  };
  const invoiceService: any = {
    create: jest.fn(async () => ({ invoiceId: 900, code: '00900' })),
    delete: jest.fn(async () => {
      if (o.deleteError) throw o.deleteError;
    }),
  };
  const detailService: any = {
    createMany: jest.fn(async () => {
      if (o.createManyError) throw o.createManyError;
      return [];
    }),
  };
  const gateway: any = {
    emitReservationToUser: jest.fn(),
    emitGuestNotification: jest.fn(),
  };
  const mails: any = {
    sendEmail: jest.fn(async () => ({ deliveredTo: 'x@y.z' })),
  };
  const service = new ReservationService(
    invoiceRepo,
    invoiceTypeRepo,
    paidTypeRepo,
    accommodationRepo,
    detailRepo,
    userRepo,
    invoiceService,
    detailService,
    gateway,
    mails,
    { subject: () => 'asunto', build: () => '<p>html</p>' } as any,
    { findOne: jest.fn(async () => null) } as any,
    { get: jest.fn(() => 'http://front') } as any,
  );
  return { service, invoiceRepo, invoiceService, detailService, userRepo, mails };
};

describe('ReservationService.create (correo)', () => {
  it('manda al huésped el correo de "en espera" y no falla si el SMTP cae', async () => {
    const { service, mails } = make();
    await service.create('u-1', DTO, NOW);
    await new Promise((r) => setImmediate(r)); // el correo sale sin bloquear la petición
    expect(mails.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'huesped@test.co', subject: 'asunto' }),
    );

    const failing = make();
    failing.mails.sendEmail.mockRejectedValueOnce(new Error('SMTP caído'));
    await expect(failing.service.create('u-1', DTO, NOW)).resolves.toMatchObject(
      { invoiceId: 900 },
    );
    await new Promise((r) => setImmediate(r));
  });
});

describe('ReservationService.create', () => {
  it('crea la reserva con el precio del hospedaje y las noches calculadas', async () => {
    const { service, invoiceService, detailService } = make();

    const res = await service.create('u-1', DTO, NOW);

    expect(detailService.createMany).toHaveBeenCalledWith(900, [
      expect.objectContaining({
        accommodationId: 6,
        amount: 2,
        priceSale: 150000,
        taxeTypeId: 2,
        isPaid: false, // una reserva en línea nace sin pagar
        startDate: '2026-10-12T20:00:00.000Z',
        endDate: '2026-10-14T17:00:00.000Z',
      }),
    ]);
    expect(res).toMatchObject({
      invoiceId: 900,
      code: '00900',
      total: 300000,
      nights: 2,
      startDate: '2026-10-12',
      endDate: '2026-10-14',
      expiresAt: '2026-10-11T20:00:00.000Z', // +24 h
    });
    // empleado interno; origen y vencimiento los pone el servidor
    const [createDto, employeeId, extra] = invoiceService.create.mock.calls[0];
    expect(employeeId).toBe('web-user'); // el usuario interno RESERVACIÓN WEB
    expect(extra).toEqual({
      reservationSource: 'ONLINE',
      reservationExpiresAt: new Date('2026-10-11T20:00:00.000Z'),
    });
    expect(createDto).toMatchObject({
      invoiceTypeId: 3,
      userId: 'u-1',
      paidTypeId: 10, // RES
      invoiceElectronic: false,
      details: [],
    });
    expect(createDto.observations).toContain('Huéspedes: 2');
    expect(createDto.observations).toContain('Llegada estimada: 16:30');
    expect(createDto.observations).toContain('Notas: Cama extra');
  });

  it('el DTO no puede traer precio ni estado: se ignoran aunque lleguen', async () => {
    const { service, detailService } = make();
    await service.create(
      'u-1',
      { ...DTO, priceSale: 1, paidTypeId: 11, userId: 'otro' } as any,
      NOW,
    );
    expect(detailService.createMany.mock.calls[0][1][0].priceSale).toBe(150000);
  });

  it('rechaza fechas inválidas sin tocar la base', async () => {
    const { service, userRepo, invoiceService } = make();
    await expect(
      service.create('u-1', { ...DTO, startDate: '2026-10-09' }, NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userRepo.findOne).not.toHaveBeenCalled();
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it.each([
    ['sin teléfono', { ...USER, phone: ' ' }],
    ['sin documento', { ...USER, identificationNumber: '' }],
    ['inactivo', { ...USER, isActive: false }],
    ['inexistente', null],
  ])('rechaza al usuario %s', async (_label, user) => {
    const { service, invoiceService } = make({ user });
    await expect(service.create('u-1', DTO, NOW)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it('rechaza más huéspedes que el aforo', async () => {
    const { service } = make();
    await expect(
      service.create('u-1', { ...DTO, guests: 5 }, NOW),
    ).rejects.toThrow(/máximo 4/);
  });

  it('rechaza un hospedaje inexistente o sin precio', async () => {
    await expect(
      make({ accommodation: null }).service.create('u-1', DTO, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      make({
        accommodation: { ...ACCOMMODATION, priceSale: '0' },
      }).service.create('u-1', DTO, NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tope de reservas pendientes por usuario', async () => {
    const { service, invoiceService } = make({ activeCount: 3 });
    await expect(service.create('u-1', DTO, NOW)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it('si ya está ocupado, falla ANTES de crear la factura', async () => {
    const { service, invoiceService } = make({ overlapCount: 1 });
    await expect(service.create('u-1', DTO, NOW)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(invoiceService.create).not.toHaveBeenCalled();
  });

  it('si createMany falla (carrera), deshace la factura y propaga el error', async () => {
    const boom = new BadRequestException('El hospedaje ya está reservado');
    const { service, invoiceService } = make({ createManyError: boom });
    await expect(service.create('u-1', DTO, NOW)).rejects.toBe(boom);
    expect(invoiceService.delete).toHaveBeenCalledWith(900);
  });

  it('si además falla el deshacer, igual propaga el error ORIGINAL', async () => {
    const boom = new BadRequestException('ocupado');
    const { service } = make({
      createManyError: boom,
      deleteError: new Error('no se pudo borrar'),
    });
    await expect(service.create('u-1', DTO, NOW)).rejects.toBe(boom);
  });
});

describe('ReservationService.confirmPayment', () => {
  it('confirma una reserva pendiente (RES → RES2)', async () => {
    const { service, invoiceRepo } = make({
      queries: [[[{ invoiceId: 5 }], 1]],
    });
    await expect(service.confirmPayment(5)).resolves.toEqual({
      status: 'confirmed',
    });
    const [sql, params] = invoiceRepo.query.mock.calls[0];
    expect(sql).toContain('"paidTypeId" = $1');
    expect(params).toEqual([11, 5, 10, 'ONLINE']); // RES2, id, RES, origen
  });

  it('es idempotente: una ya pagada no falla', async () => {
    const { service } = make({
      queries: [[[], 0]],
      savedInvoice: { paidType: { code: 'RES2' } },
    });
    await expect(service.confirmPayment(5)).resolves.toEqual({
      status: 'already-paid',
    });
  });

  it('si el cron ya la reclamó (online, RES, sin vencimiento), avisa que venció', async () => {
    const { service } = make({
      queries: [[[], 0]],
      savedInvoice: { paidType: { code: 'RES' }, reservationSource: 'ONLINE' },
    });
    await expect(service.confirmPayment(5)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('una factura que no es reserva pendiente se rechaza', async () => {
    const { service } = make({
      queries: [[[], 0]],
      savedInvoice: { paidType: { code: 'PAG' } },
    });
    await expect(service.confirmPayment(5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('una factura inexistente da 404', async () => {
    const { service } = make({ queries: [[[], 0]], savedInvoice: null });
    await expect(service.confirmPayment(5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ReservationService.extendHold', () => {
  it('devuelve el nuevo vencimiento', async () => {
    const { service } = make({
      queries: [[[{ reservationExpiresAt: '2026-10-12T20:00:00.000Z' }], 1]],
    });
    await expect(service.extendHold(5, NOW)).resolves.toEqual({
      expiresAt: '2026-10-12T20:00:00.000Z',
    });
  });

  it('rechaza si no es una reserva online pendiente y vigente', async () => {
    const { service } = make({ queries: [[[], 0]] });
    await expect(service.extendHold(5, NOW)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('ReservationService.releaseExpired', () => {
  it('reclama y borra cada reserva vencida', async () => {
    const { service, invoiceService } = make({
      candidates: [{ invoiceId: 7 }, { invoiceId: 8 }],
      queries: [[[{ invoiceId: 7 }], 1], [[{ invoiceId: 8 }], 1]],
    });
    await expect(service.releaseExpired(NOW)).resolves.toBe(2);
    expect(invoiceService.delete.mock.calls.map((c: any[]) => c[0])).toEqual([
      7, 8,
    ]);
  });

  it('si la pagaron en medio (el reclamo afecta 0 filas), NO la borra', async () => {
    const { service, invoiceService } = make({
      candidates: [{ invoiceId: 7 }],
      queries: [[[], 0]],
    });
    await expect(service.releaseExpired(NOW)).resolves.toBe(0);
    expect(invoiceService.delete).not.toHaveBeenCalled();
  });

  it('si borrar falla, devuelve el vencimiento para reintentar y sigue con las demás', async () => {
    const { service, invoiceService, invoiceRepo } = make({
      candidates: [{ invoiceId: 7 }, { invoiceId: 8 }],
      queries: [
        [[{ invoiceId: 7 }], 1], // reclamo de 7
        [[], 0], // restauración de 7
        [[{ invoiceId: 8 }], 1], // reclamo de 8
      ],
    });
    invoiceService.delete
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce(undefined);

    await expect(service.releaseExpired(NOW)).resolves.toBe(1);

    const restore = invoiceRepo.query.mock.calls[1];
    expect(restore[0]).toContain('SET "reservationExpiresAt" = $2');
    expect(restore[1]).toEqual([7, NOW]);
    expect(invoiceService.delete).toHaveBeenCalledTimes(2);
  });

  it('sin candidatas no hace nada', async () => {
    const { service, invoiceService } = make({ candidates: [] });
    await expect(service.releaseExpired(NOW)).resolves.toBe(0);
    expect(invoiceService.delete).not.toHaveBeenCalled();
  });
});
