import { Injectable } from '@nestjs/common';
import { IdentificationTypeRepository } from '../repositories/identificationType.repository';
import { RoleRepository } from '../repositories/role.repository';
import { Repository } from 'typeorm';

@Injectable()
export class RepositoryService {
  public repositories: {
    role: RoleRepository;
    identificationType: IdentificationTypeRepository;
  };

  constructor(
    private readonly _roleRepository: RoleRepository,
    private readonly _identificationTipeRepository: IdentificationTypeRepository,
  ) {
    this.repositories = {
      role: _roleRepository,
      identificationType: _identificationTipeRepository,
    };
  }

  /**
   * Método para obtener todas las entidades del repositorio enviado por los parametros
   * @param repository
   * @returns
   */
  async getEntities<T>(repository: Repository<T>): Promise<T[]> {
    return await repository.find();
  }
}
