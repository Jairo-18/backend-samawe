import {
  CreateExcursionDto,
  UpdateExcursionDto,
} from './../dtos/excursion.dto';
import { ExcursionService } from './../services/excursion.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExcursionUC {
  constructor(private readonly _excursionService: ExcursionService) {}

  async create(excursionId: CreateExcursionDto) {
    return await this._excursionService.create(excursionId);
  }

  async update(excursionId: string, excursionData: UpdateExcursionDto) {
    return await this._excursionService.update(excursionId, excursionData);
  }

  async findOne(excursionId: string) {
    return await this._excursionService.findOne(excursionId);
  }

  async findAll() {
    return await this._excursionService.findAll();
  }

  async delete(excursionId: number) {
    return await this._excursionService.delete(excursionId);
  }
}
