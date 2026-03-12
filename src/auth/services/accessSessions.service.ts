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
      id: body.id,
      accessToken: body.accessToken,
      user: { userId: body.userId },
      organizational: body.organizationalId
        ? { organizationalId: body.organizationalId }
        : undefined,
    });

    const saved = await this._accessSessionsRepository.save(session);
    return saved.id;
  }

  async findOneByParams(
    params: AccessSessionsFiltersModel,
  ): Promise<AccessSessions> {
    return await this._accessSessionsRepository.findOne({
      where: {
        id: params.id,
        user: params.userId ? { userId: params.userId } : undefined,
        organizational: params.organizationalId
          ? { organizationalId: params.organizationalId }
          : undefined,
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
