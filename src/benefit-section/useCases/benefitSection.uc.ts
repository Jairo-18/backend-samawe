import { Injectable } from '@nestjs/common';
import { BenefitSectionService } from '../services/benefitSection.service';
import {
  CreateBenefitSectionDto,
  UpdateBenefitSectionDto,
  CreateBenefitItemDto,
  UpdateBenefitItemDto,
} from '../dtos/benefitSection.dto';

@Injectable()
export class BenefitSectionUC {
  constructor(private readonly _benefitSectionService: BenefitSectionService) {}

  async getSections(organizationalId: string) {
    return this._benefitSectionService.getSections(organizationalId);
  }

  async createSection(organizationalId: string, dto: CreateBenefitSectionDto) {
    return this._benefitSectionService.createSection(organizationalId, dto);
  }

  async updateSection(benefitSectionId: string, dto: UpdateBenefitSectionDto) {
    return this._benefitSectionService.updateSection(benefitSectionId, dto);
  }

  async deleteSection(benefitSectionId: string) {
    return this._benefitSectionService.deleteSection(benefitSectionId);
  }

  async addItem(benefitSectionId: string, dto: CreateBenefitItemDto) {
    return this._benefitSectionService.addItem(benefitSectionId, dto);
  }

  async updateItem(benefitItemId: string, dto: UpdateBenefitItemDto) {
    return this._benefitSectionService.updateItem(benefitItemId, dto);
  }

  async deleteItem(benefitItemId: string) {
    return this._benefitSectionService.deleteItem(benefitItemId);
  }
}
