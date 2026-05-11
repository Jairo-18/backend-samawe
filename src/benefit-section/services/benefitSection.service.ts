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
import { TranslationService } from '../../shared/services/translation.service';

@Injectable()
export class BenefitSectionService {
  constructor(
    private readonly _benefitSectionRepository: BenefitSectionRepository,
    private readonly _benefitItemRepository: BenefitItemRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _translationService: TranslationService,
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

    const title = await this._translationService.toTranslatedField(dto.title);

    const result = await this._benefitSectionRepository.insert({
      title,
      order: dto.order ?? 0,
      organizational,
    });

    const benefitSectionId = result.identifiers[0].benefitSectionId as string;

    if (dto.items?.length) {
      const section = await this._findSectionOrFail(benefitSectionId);
      const translatedItems = await Promise.all(
        dto.items.map(async (item, i) => ({
          name: await this._translationService.toTranslatedField(item.name),
          icon: item.icon,
          order: item.order ?? i,
          benefitSection: section,
        })),
      );
      await this._benefitItemRepository.insert(translatedItems);
    }

    return { rowId: benefitSectionId };
  }

  async updateSection(
    benefitSectionId: string,
    dto: UpdateBenefitSectionDto,
  ) {
    await this._findSectionOrFail(benefitSectionId);
    const update: Partial<{ title: Record<string, string>; order: number }> = {};
    if (dto.title) {
      update.title = await this._translationService.toTranslatedField(dto.title);
    }
    if (dto.order !== undefined) {
      update.order = dto.order;
    }
    await this._benefitSectionRepository.update({ benefitSectionId }, update);
  }

  async deleteSection(benefitSectionId: string) {
    await this._findSectionOrFail(benefitSectionId);
    await this._benefitSectionRepository.delete({ benefitSectionId });
  }

  async addItem(benefitSectionId: string, dto: CreateBenefitItemDto) {
    const section = await this._findSectionOrFail(benefitSectionId);

    const name = await this._translationService.toTranslatedField(dto.name);

    const result = await this._benefitItemRepository.insert({
      name,
      icon: dto.icon,
      order: dto.order ?? 0,
      benefitSection: section,
    });

    return { rowId: result.identifiers[0].benefitItemId };
  }

  async updateItem(benefitItemId: string, dto: UpdateBenefitItemDto) {
    await this._findItemOrFail(benefitItemId);
    const update: Partial<{ name: Record<string, string>; icon: string; order: number }> = {};
    if (dto.name) {
      update.name = await this._translationService.toTranslatedField(dto.name);
    }
    if (dto.icon !== undefined) {
      update.icon = dto.icon;
    }
    if (dto.order !== undefined) {
      update.order = dto.order;
    }
    await this._benefitItemRepository.update({ benefitItemId }, update);
  }

  async deleteItem(benefitItemId: string) {
    await this._findItemOrFail(benefitItemId);
    await this._benefitItemRepository.delete({ benefitItemId });
  }
}
