import { NOT_FOUND_MESSAGE } from './../../shared/constants/messages.constant';
import { AccessSessions } from './../../shared/entities/accessSessions.entity';
import { AccessSessionsRepository } from './../../shared/repositories/accessSessions.repository';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AccessSessionsFiltersModel,
  AccessSessionsModel,
} from '../models/accessSessions.model';

@Injectable()
export class AccessSessionsService {
  constructor(
    private readonly _accessSessionsRepository: AccessSessionsRepository,
  ) {}

  async generateSession(body: AccessSessionsModel): Promise<string> {
    const session = this._accessSessionsRepository.create({
      ...body,
      user: { userId: body.userId }, // esto es lo más importante
    });

    const saved = await this._accessSessionsRepository.save(session);
    return saved.id;
  }

  async findOneByParams(
    params: AccessSessionsFiltersModel,
  ): Promise<AccessSessions> {
    return await this._accessSessionsRepository.findOne({
      where: {
        id: params.id, // Si buscas por id de la sesión
        user: params.userId ? { userId: params.userId } : undefined, // Si pasas un userId, filtra por este
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const sessionExists = await this.findOneByParams({ id, userId });
    if (!sessionExists) {
      throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
    }
    await this._accessSessionsRepository.delete(id);
  }
}
