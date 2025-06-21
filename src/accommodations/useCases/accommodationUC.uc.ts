import {
  CreateAccommodationDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
import { AccommodationService } from './../services/accommodation.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccommodationUC {
  constructor(private readonly _accommodationService: AccommodationService) {}

  async create(accommodationId: CreateAccommodationDto) {
    return await this._accommodationService.create(accommodationId);
  }

  async findOne(accommodationId: string) {
    return await this._accommodationService.findOne(accommodationId);
  }

  async findAll() {
    return await this._accommodationService.findAll();
  }

  async update(
    accommodationId: string,
    accommodationData: UpdateAccommodationDto,
  ) {
    return await this._accommodationService.update(
      accommodationId,
      accommodationData,
    );
  }

  async delete(accommodationId: number) {
    return await this._accommodationService.delete(accommodationId);
  }
}
