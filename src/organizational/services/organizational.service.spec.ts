import { HttpException } from '@nestjs/common';
import { OrganizationalService } from './organizational.service';

/**
 * Borrar una organización con datos reventaba con un error de llave foránea
 * DESPUÉS de haber borrado ya sus archivos. Ahora se comprueba antes.
 */
describe('OrganizationalService.delete', () => {
  const build = (countsByTable: Record<string, number>) => {
    const query = jest.fn(async (sql: string) => {
      const table = /FROM "(\w+)"/.exec(sql)?.[1] ?? '';
      return [{ n: countsByTable[table] ?? 0 }];
    });
    const orgRepo = {
      findOne: jest.fn(async () => ({ organizationalId: 'org-2' })),
      delete: jest.fn(async () => undefined),
      manager: { query },
    };
    const mediaRepo = { find: jest.fn(async () => [{ publicId: 'organizational/logo.webp' }]) };
    const corporateRepo = { find: jest.fn(async () => []) };
    const storage = { deleteImage: jest.fn(async () => undefined) };
    const service = new OrganizationalService(
      orgRepo as never,
      mediaRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      storage as never,
      corporateRepo as never,
      {} as never,
    );
    return { service, orgRepo, storage };
  };

  it('con datos: 409 y NO borra archivos ni la fila', async () => {
    const { service, orgRepo, storage } = build({ User: 3, Invoice: 10 });
    const err = await service.delete('org-2').catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(409);
    expect((err as HttpException).message).toContain('3 usuarios');
    expect((err as HttpException).message).toContain('10 facturas');
    expect(storage.deleteImage).not.toHaveBeenCalled();
    expect(orgRepo.delete).not.toHaveBeenCalled();
  });

  it('vacía: borra archivos y la fila', async () => {
    const { service, orgRepo, storage } = build({});
    await service.delete('org-2');
    expect(storage.deleteImage).toHaveBeenCalledWith('organizational/logo.webp');
    expect(orgRepo.delete).toHaveBeenCalledWith({ organizationalId: 'org-2' });
  });
});
