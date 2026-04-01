import { Injectable } from '@nestjs/common';
import { OrganizationalService } from '../services/organizational.service';
import {
  CreateOrganizationalDto,
  UpdateOrganizationalDto,
  CreateOrganizationalMediaDto,
  UpdateOrganizationalMediaDto,
  CreateCorporateValueDto,
  UpdateCorporateValueDto,
} from '../dtos/organizational.dto';

@Injectable()
export class OrganizationalUC {
  constructor(private readonly _organizationalService: OrganizationalService) {}

  async create(dto: CreateOrganizationalDto) {
    return await this._organizationalService.create(dto);
  }

  async findAll() {
    return await this._organizationalService.findAll();
  }

  async findOne(id: string) {
    return await this._organizationalService.findOne(id);
  }

  async findBySlug(slug: string) {
    return await this._organizationalService.findBySlug(slug);
  }

  async update(id: string, dto: UpdateOrganizationalDto) {
    return await this._organizationalService.update(id, dto);
  }

  async delete(id: string) {
    return await this._organizationalService.delete(id);
  }

  async addMedia(organizationalId: string, dto: CreateOrganizationalMediaDto) {
    return await this._organizationalService.addMedia(organizationalId, dto);
  }

  async updateMedia(mediaId: string, dto: UpdateOrganizationalMediaDto) {
    return await this._organizationalService.updateMedia(mediaId, dto);
  }

  async deleteMedia(mediaId: string) {
    return await this._organizationalService.deleteMedia(mediaId);
  }

  async getMediaMap(organizationalId: string) {
    return await this._organizationalService.getMediaMap(organizationalId);
  }

  async findAllMediaTypes() {
    return await this._organizationalService.findAllMediaTypes();
  }

  async getCorporateValues(organizationalId: string) {
    return await this._organizationalService.getCorporateValues(organizationalId);
  }

  async createCorporateValue(organizationalId: string, dto: CreateCorporateValueDto) {
    return await this._organizationalService.createCorporateValue(organizationalId, dto);
  }

  async updateCorporateValue(corporateValueId: string, dto: UpdateCorporateValueDto) {
    return await this._organizationalService.updateCorporateValue(corporateValueId, dto);
  }

  async deleteCorporateValue(corporateValueId: string) {
    return await this._organizationalService.deleteCorporateValue(corporateValueId);
  }

  async uploadCorporateValueImage(corporateValueId: string, imageUrl: string, imagePublicId: string) {
    return await this._organizationalService.uploadCorporateValueImage(corporateValueId, imageUrl, imagePublicId);
  }

  async deleteCorporateValueImage(corporateValueId: string) {
    return await this._organizationalService.deleteCorporateValueImage(corporateValueId);
  }
}
