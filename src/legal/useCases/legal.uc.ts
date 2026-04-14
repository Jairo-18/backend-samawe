import { Injectable } from '@nestjs/common';
import { LegalService } from '../services/legal.service';
import {
  CreateLegalSectionDto,
  CreateLegalItemDto,
  UpdateLegalItemDto,
  CreateLegalItemChildDto,
  UpdateLegalItemChildDto,
  ReorderDto,
} from '../dtos/legal.dto';
import { LegalType } from '../constants/legal.constants';

@Injectable()
export class LegalUC {
  constructor(private readonly _legalService: LegalService) {}

  async getAllSections(organizationalId: string) {
    return this._legalService.getAllSections(organizationalId);
  }

  async createSection(organizationalId: string, dto: CreateLegalSectionDto) {
    return this._legalService.createSection(organizationalId, dto);
  }

  async deleteSection(legalSectionId: string) {
    return this._legalService.deleteSection(legalSectionId);
  }

  async addItem(legalSectionId: string, dto: CreateLegalItemDto) {
    return this._legalService.addItem(legalSectionId, dto);
  }

  async updateItem(legalItemId: string, dto: UpdateLegalItemDto) {
    return this._legalService.updateItem(legalItemId, dto);
  }

  async deleteItem(legalItemId: string) {
    return this._legalService.deleteItem(legalItemId);
  }

  async addChild(legalItemId: string, dto: CreateLegalItemChildDto) {
    return this._legalService.addChild(legalItemId, dto);
  }

  async updateChild(legalItemChildId: string, dto: UpdateLegalItemChildDto) {
    return this._legalService.updateChild(legalItemChildId, dto);
  }

  async deleteChild(legalItemChildId: string) {
    return this._legalService.deleteChild(legalItemChildId);
  }

  async reorderItems(legalSectionId: string, dto: ReorderDto) {
    return this._legalService.reorderItems(legalSectionId, dto);
  }

  async reorderChildren(legalItemId: string, dto: ReorderDto) {
    return this._legalService.reorderChildren(legalItemId, dto);
  }
}
