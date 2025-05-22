import { Repository, DeepPartial } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GenericTypeService<T extends object> {
  constructor(private readonly _repository: Repository<T>) {}

  async createWithValidation(type: string, data: DeepPartial<T>): Promise<T> {
    // Validar duplicado sólo con el campo code porque type es solo para el mensaje
    const existing = await this._repository.findOne({
      where: { code: (data as any).code },
    } as any);

    if (existing) {
      throw new ConflictException(
        `El registro con code "${(data as any).code}" ya existe en ${type}.`,
      );
    }
    return this.create(data);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this._repository.create(data);
    return this._repository.save(entity);
  }

  async findAll(): Promise<T[]> {
    return this._repository.find();
  }

  static async findAllTypesFromRepositories(
    repositories: Record<string, Repository<any>>,
  ): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    for (const [typeName, repository] of Object.entries(repositories)) {
      const service = new GenericTypeService(repository);
      const data = await service.findAll();
      result[typeName] = data;
    }

    return result;
  }

  async findOne(id: number | string): Promise<T> {
    return this._repository.findOne({ where: { id } as any });
  }

  async update(id: string | number, data: DeepPartial<T>): Promise<void> {
    // Validaciones previas, por ejemplo código duplicado
    if ('code' in data) {
      const existing = await this._repository.findOne({
        where: { code: (data as any).code },
      } as any);
      if (existing && (existing as any).id !== id) {
        throw new ConflictException(
          `El código "${(data as any).code}" ya está en uso.`,
        );
      }
    }

    // Actualizar el registro, sin devolver nada
    await this._repository.update(id, data as any);
  }

  async delete(id: number | string): Promise<void> {
    const primaryColumn =
      this._repository.metadata.primaryColumns[0].propertyName;

    // Verificar existencia
    const existing = await this._repository.findOne({
      where: { [primaryColumn]: id } as any,
    });

    if (!existing) {
      throw new NotFoundException(
        `Registro con ${primaryColumn}="${id}" no encontrado.`,
      );
    }

    await this._repository.delete({ [primaryColumn]: id } as any);
  }
}
