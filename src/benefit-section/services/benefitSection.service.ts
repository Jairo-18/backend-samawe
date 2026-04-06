import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BenefitSectionRepository } from '../../shared/repositories/benefitSection.repository';
import { BenefitItemRepository } from '../../shared/repositories/benefitItem.repository';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  CreateBenefitSectionDto,
  UpdateBenefitSectionDto,
  CreateBenefitItemDto,
  UpdateBenefitItemDto,
} from '../dtos/benefitSection.dto';

@Injectable()
export class BenefitSectionService {
  constructor(
    private readonly _benefitSectionRepository: BenefitSectionRepository,
    private readonly _benefitItemRepository: BenefitItemRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  private async _findOrgOrFail(organizationalId: string) {
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
    });
    if (!org) {
      throw new HttpException(
        'Organización no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    return org;
  }

  private async _findSectionOrFail(benefitSectionId: string) {
    const section = await this._benefitSectionRepository.findOne({
      where: { benefitSectionId },
      relations: ['items'],
    });
    if (!section) {
      throw new HttpException(
        'Sección de beneficios no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    return section;
  }

  private async _findItemOrFail(benefitItemId: string) {
    const item = await this._benefitItemRepository.findOne({
      where: { benefitItemId },
    });
    if (!item) {
      throw new HttpException(
        'Item de beneficio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  async getSections(organizationalId: string) {
    await this._findOrgOrFail(organizationalId);
    return this._benefitSectionRepository.find({
      where: { organizational: { organizationalId } },
      relations: ['items'],
      order: { order: 'ASC', items: { order: 'ASC' } },
    });
  }

  async createSection(organizationalId: string, dto: CreateBenefitSectionDto) {
    const organizational = await this._findOrgOrFail(organizationalId);

    const result = await this._benefitSectionRepository.insert({
      title: dto.title,
      order: dto.order ?? 0,
      organizational,
    });

    const benefitSectionId = result.identifiers[0].benefitSectionId as string;

    if (dto.items?.length) {
      const section = await this._findSectionOrFail(benefitSectionId);
      await this._benefitItemRepository.insert(
        dto.items.map((item, i) => ({
          name: item.name,
          icon: item.icon,
          order: item.order ?? i,
          benefitSection: section,
        })),
      );
    }

    return { rowId: benefitSectionId };
  }

  async updateSection(
    benefitSectionId: string,
    dto: UpdateBenefitSectionDto,
  ) {
    await this._findSectionOrFail(benefitSectionId);
    await this._benefitSectionRepository.update({ benefitSectionId }, { ...dto });
  }

  async deleteSection(benefitSectionId: string) {
    await this._findSectionOrFail(benefitSectionId);
    await this._benefitSectionRepository.delete({ benefitSectionId });
  }

  async addItem(benefitSectionId: string, dto: CreateBenefitItemDto) {
    const section = await this._findSectionOrFail(benefitSectionId);

    const result = await this._benefitItemRepository.insert({
      name: dto.name,
      icon: dto.icon,
      order: dto.order ?? 0,
      benefitSection: section,
    });

    return { rowId: result.identifiers[0].benefitItemId };
  }

  async updateItem(benefitItemId: string, dto: UpdateBenefitItemDto) {
    await this._findItemOrFail(benefitItemId);
    await this._benefitItemRepository.update({ benefitItemId }, { ...dto });
  }

  async deleteItem(benefitItemId: string) {
    await this._findItemOrFail(benefitItemId);
    await this._benefitItemRepository.delete({ benefitItemId });
  }
}
