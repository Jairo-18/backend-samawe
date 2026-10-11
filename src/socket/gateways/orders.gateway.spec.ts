import { OrdersGateway, ordersRoom } from './orders.gateway';

/**
 * H4 (auditoría multi-hotel, 10 oct 2026): `emitInvoiceItemAdded` y
 * `emitOrderUpdate` hacían `server.emit` a TODOS los conectados, y `joinOrders`
 * metía a cualquier sesión (huéspedes incluidos) en una única `orderRoom`.
 */
describe('OrdersGateway — rooms por organización', () => {
  const buildGateway = (user: unknown) => {
    const findOne = jest.fn(async () => user);
    const dataSource = { getRepository: () => ({ findOne }) };
    const gateway = new OrdersGateway(
      {} as never,
      {} as never,
      dataSource as never,
    );
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    (gateway as unknown as { server: unknown }).server = {
      to,
      emit: jest.fn(() => {
        throw new Error('server.emit global no debe usarse');
      }),
    };
    return { gateway, to, emit, findOne };
  };

  const client = (userId?: string, rooms: string[] = []) => {
    const set = new Set<string>(['socket-id', ...rooms]);
    return {
      data: { userId },
      rooms: set,
      join: jest.fn((r: string) => set.add(r)),
      leave: jest.fn((r: string) => set.delete(r)),
    };
  };

  const staff = (orgId: string | null, code = 'CHE') => ({
    userId: 'u1',
    roleType: { code },
    organizational: orgId ? { organizationalId: orgId } : null,
  });

  it('emitInvoiceItemAdded va solo a la room de la organización', () => {
    const { gateway, to, emit } = buildGateway(null);
    gateway.emitInvoiceItemAdded(
      7,
      { total: 1, subtotalWithTax: 1, subtotalWithoutTax: 1 },
      'org-a',
    );
    expect(to).toHaveBeenCalledWith('org_org-a:orders');
    expect(emit).toHaveBeenCalledWith(
      'invoiceItemAdded',
      expect.objectContaining({ invoiceId: 7 }),
    );
  });

  it('emitOrderUpdate va solo a la room de la organización', () => {
    const { gateway, to } = buildGateway(null);
    gateway.emitOrderUpdate({} as never, 'org-b');
    expect(to).toHaveBeenCalledWith('org_org-b:orders');
  });

  it('el staff entra a la room de SU organización, no a la que pida', async () => {
    const { gateway } = buildGateway(staff('org-a'));
    const c = client('u1');
    await gateway.handleJoinOrders(c as never);
    expect(c.join).toHaveBeenCalledWith(ordersRoom('org-a'));
    expect(c.rooms.has('orderRoom')).toBe(false);
  });

  it('un huésped (USER) no entra a ninguna room de órdenes', async () => {
    const { gateway } = buildGateway(staff('org-a', 'USER'));
    const c = client('u1');
    const res = await gateway.handleJoinOrders(c as never);
    expect(c.join).not.toHaveBeenCalled();
    expect(res.event).toBe('joinRejected');
  });

  it('sin sesión no entra ni consulta la base', async () => {
    const { gateway, findOne } = buildGateway(staff('org-a'));
    const c = client(undefined);
    await gateway.handleJoinOrders(c as never);
    expect(c.join).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('al reentrar sale de la room de otra organización', async () => {
    const { gateway } = buildGateway(staff('org-a'));
    const c = client('u1', [ordersRoom('org-b')]);
    await gateway.handleJoinOrders(c as never);
    expect(c.leave).toHaveBeenCalledWith(ordersRoom('org-b'));
    expect(c.rooms.has(ordersRoom('org-a'))).toBe(true);
  });

  it('sin organización asignada comparte `unassigned`, nunca la de un hotel', () => {
    expect(ordersRoom(null)).toBe('org_unassigned:orders');
    expect(ordersRoom(undefined)).toBe(ordersRoom(null));
    expect(ordersRoom('org-a')).not.toBe(ordersRoom(null));
  });
});
