import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { DataSource } from 'typeorm';
import { OwnedBySpec, OwnershipInterceptor } from './owned-by';
import { TenantInsertSubscriber } from './tenant-insert.subscriber';
import { Menu } from '../shared/entities/menu.entity';
import { Recipe } from '../shared/entities/recipe.entity';
import { AccommodationImage } from '../shared/entities/accommodationImage.entity';
import { Product } from '../shared/entities/product.entity';

/**
 * Fase 3 del multi-hotel: ids de otro hotel en la RUTA (`@OwnedBy`) y en el
 * BODY / inserciones sin hotel (`TenantInsertSubscriber`).
 */
const ORG = 'org-a';
const OTHER = 'org-b';

const tenantWith = (organizationalId?: string) => ({ organizationalId }) as any;

describe('OwnershipInterceptor', () => {
  const build = (specs: OwnedBySpec[] | undefined, orgId: string | undefined, owners: Record<string, string | null | undefined>) => {
    const reflector = { getAllAndOverride: () => specs } as unknown as Reflector;
    const interceptor = new OwnershipInterceptor(reflector, {} as DataSource, tenantWith(orgId));
    jest
      .spyOn(interceptor as any, '_ownerOf')
      .mockImplementation(async (_spec: OwnedBySpec, value: string) => owners[value]);
    return interceptor;
  };
  const run = (interceptor: OwnershipInterceptor, params: Record<string, string>, user?: object) => {
    const ctx = {
      getType: () => 'http',
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ params, user, method: 'GET', url: '/x' }) }),
    } as any;
    return lastValueFrom(interceptor.intercept(ctx, { handle: () => of('ok') }));
  };
  const spec = (extra: Partial<OwnedBySpec> = {}): OwnedBySpec => ({ entity: Product, param: 'id', ...extra });

  it('sin @OwnedBy no consulta nada', async () => {
    await expect(run(build(undefined, ORG, {}), { id: '1' })).resolves.toBe('ok');
  });

  it('registro del mismo hotel: pasa', async () => {
    await expect(run(build([spec()], ORG, { '1': ORG }), { id: '1' })).resolves.toBe('ok');
  });

  it('registro de otro hotel: 404', async () => {
    await expect(run(build([spec()], ORG, { '1': OTHER }), { id: '1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registro sin hotel: cuenta como ajeno (404)', async () => {
    await expect(run(build([spec()], ORG, { '1': null }), { id: '1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registro inexistente: sigue al handler', async () => {
    await expect(run(build([spec()], ORG, {}), { id: '1' })).resolves.toBe('ok');
  });

  it('sin hotel en la petición: falla cerrado', async () => {
    await expect(run(build([spec()], undefined, { '1': ORG }), { id: '1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('varios ids: basta uno ajeno', async () => {
    const i = build([spec(), spec({ param: 'detailId' })], ORG, { '1': ORG, '2': OTHER });
    await expect(run(i, { id: '1', detailId: '2' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allowSelf: el propio usuario pasa aunque sea de otro hotel', async () => {
    const i = build([spec({ allowSelf: true })], ORG, { u1: OTHER });
    await expect(run(i, { id: 'u1' }, { userId: 'u1' })).resolves.toBe('ok');
    await expect(run(i, { id: 'u1' }, { userId: 'u2' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('parámetro mal nombrado en el decorador: error de configuración', async () => {
    await expect(run(build([spec({ param: 'nope' })], ORG, {}), { id: '1' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

describe('TenantInsertSubscriber', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Solo metadatos (sin conexión): las relaciones reales de las entidades.
    dataSource = new DataSource({
      type: 'postgres',
      entities: [__dirname + '/../shared/entities/*.entity.ts'],
    });
    await (dataSource as any).buildMetadatas();
  });

  const build = (orgId: string | undefined, owners: Record<string, string | null | undefined> = {}) => {
    const fakeDs = { subscribers: [] as unknown[] } as unknown as DataSource;
    const sub = new TenantInsertSubscriber(fakeDs, tenantWith(orgId));
    jest
      .spyOn(sub as any, '_ownerOf')
      .mockImplementation(async (target: any, id: string) => owners[`${target.tableName}:${id}`]);
    return sub;
  };
  const insert = (sub: TenantInsertSubscriber, target: any, entity: any) =>
    sub.beforeInsert({ entity, metadata: dataSource.getMetadata(target) } as any);

  it('inserción sin hotel recibe el de la petición (columna explícita y relación)', async () => {
    const menu: any = { name: { es: 'x' } };
    await insert(build(ORG), Menu, menu);
    expect(menu.organizationalId).toBe(ORG);
    expect(menu.organizational).toEqual({ organizationalId: ORG });
  });

  it('inserción sin hotel recibe el de la petición (solo relación)', async () => {
    const image: any = { publicId: 'p' };
    await insert(build(ORG), AccommodationImage, image);
    expect(image.organizational).toEqual({ organizationalId: ORG });
  });

  it('si ya trae hotel, no se toca', async () => {
    const menu: any = { organizationalId: OTHER };
    await insert(build(ORG), Menu, menu);
    expect(menu.organizationalId).toBe(OTHER);
  });

  it('fuera de una petición no hace nada', async () => {
    const menu: any = {};
    await insert(build(undefined), Menu, menu);
    expect(menu.organizationalId).toBeUndefined();
  });

  it('relación a un registro de otro hotel: 404', async () => {
    const recipe: any = { product: { productId: 329 }, ingredient: { productId: 1 } };
    const sub = build(ORG, { 'Product:329': OTHER, 'Product:1': ORG });
    await expect(insert(sub, Recipe, recipe)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('relaciones del mismo hotel o sin hotel: pasa', async () => {
    const recipe: any = { product: { productId: 1 }, ingredient: { productId: 2 } };
    const sub = build(ORG, { 'Product:1': ORG, 'Product:2': null });
    await expect(insert(sub, Recipe, recipe)).resolves.toBeUndefined();
  });
});
