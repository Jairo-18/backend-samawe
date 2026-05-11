import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LegalSectionRepository } from '../../shared/repositories/legalSection.repository';
import { LegalItemRepository } from '../../shared/repositories/legalItem.repository';
import { LegalItemChildRepository } from '../../shared/repositories/legalItemChild.repository';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  CreateLegalSectionDto,
  CreateLegalItemDto,
  UpdateLegalItemDto,
  CreateLegalItemChildDto,
  UpdateLegalItemChildDto,
  ReorderDto,
} from '../dtos/legal.dto';
import { LegalType } from '../constants/legal.constants';
import { TranslationService } from '../../shared/services/translation.service';
import { TranslatedInput } from '../../shared/types/translated-field.type';

@Injectable()
export class LegalService {
  constructor(
    private readonly _legalSectionRepository: LegalSectionRepository,
    private readonly _legalItemRepository: LegalItemRepository,
    private readonly _legalItemChildRepository: LegalItemChildRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _translationService: TranslationService,
  ) {}

  private async _findOrgOrFail(organizationalId: string) {
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
    });
    if (!org) throw new HttpException('Organización no encontrada', HttpStatus.NOT_FOUND);
    return org;
  }

  private async _findSectionOrFail(legalSectionId: string) {
    const section = await this._legalSectionRepository.findOne({
      where: { legalSectionId },
      relations: ['items', 'items.children'],
    });
    if (!section) throw new HttpException('Sección legal no encontrada', HttpStatus.NOT_FOUND);
    return section;
  }

  private async _findItemOrFail(legalItemId: string) {
    const item = await this._legalItemRepository.findOne({
      where: { legalItemId },
      relations: ['children'],
    });
    if (!item) throw new HttpException('Item legal no encontrado', HttpStatus.NOT_FOUND);
    return item;
  }

  private async _findChildOrFail(legalItemChildId: string) {
    const child = await this._legalItemChildRepository.findOne({
      where: { legalItemChildId },
    });
    if (!child) throw new HttpException('Sub-item legal no encontrado', HttpStatus.NOT_FOUND);
    return child;
  }

  private _translateOptional(input?: TranslatedInput) {
    if (!input) return Promise.resolve(undefined);
    return this._translationService.toTranslatedField(input);
  }

  async getAllSections(organizationalId: string) {
    await this._findOrgOrFail(organizationalId);
    return this._legalSectionRepository.find({
      where: { organizational: { organizationalId } },
      relations: ['items', 'items.children'],
      order: { items: { order: 'ASC', children: { order: 'ASC' } } },
    });
  }

  async createSection(organizationalId: string, dto: CreateLegalSectionDto) {
    const organizational = await this._findOrgOrFail(organizationalId);

    const existing = await this._legalSectionRepository.findOne({
      where: { organizational: { organizationalId }, type: dto.type },
    });
    if (existing) {
      throw new HttpException(
        `Ya existe una sección de tipo "${dto.type}" para esta organización`,
        HttpStatus.CONFLICT,
      );
    }

    const result = await this._legalSectionRepository.insert({ type: dto.type, organizational });
    const legalSectionId = result.identifiers[0].legalSectionId as string;

    if (dto.items?.length) {
      const section = await this._findSectionOrFail(legalSectionId);
      for (const [i, itemDto] of dto.items.entries()) {
        const [title, description] = await Promise.all([
          this._translateOptional(itemDto.title),
          this._translateOptional(itemDto.description),
        ]);
        const itemResult = await this._legalItemRepository.insert({
          title,
          description,
          order: itemDto.order ?? i,
          legalSection: section,
        });
        const legalItemId = itemResult.identifiers[0].legalItemId as string;
        if (itemDto.children?.length) {
          const item = await this._findItemOrFail(legalItemId);
          const translatedChildren = await Promise.all(
            itemDto.children.map(async (c, j) => ({
              content: await this._translationService.toTranslatedField(c.content),
              order: c.order ?? j,
              legalItem: item,
            })),
          );
          await this._legalItemChildRepository.insert(translatedChildren);
        }
      }
    }

    return { rowId: legalSectionId };
  }

  async deleteSection(legalSectionId: string) {
    await this._findSectionOrFail(legalSectionId);
    await this._legalSectionRepository.delete({ legalSectionId });
  }

  async addItem(legalSectionId: string, dto: CreateLegalItemDto) {
    const section = await this._findSectionOrFail(legalSectionId);

    const [title, description] = await Promise.all([
      this._translateOptional(dto.title),
      this._translateOptional(dto.description),
    ]);

    const result = await this._legalItemRepository.insert({
      title,
      description,
      order: dto.order ?? 0,
      legalSection: section,
    });
    const legalItemId = result.identifiers[0].legalItemId as string;

    if (dto.children?.length) {
      const item = await this._findItemOrFail(legalItemId);
      const translatedChildren = await Promise.all(
        dto.children.map(async (c, j) => ({
          content: await this._translationService.toTranslatedField(c.content),
          order: c.order ?? j,
          legalItem: item,
        })),
      );
      await this._legalItemChildRepository.insert(translatedChildren);
    }

    return { rowId: legalItemId };
  }

  async updateItem(legalItemId: string, dto: UpdateLegalItemDto) {
    await this._findItemOrFail(legalItemId);
    const update: Record<string, unknown> = {};
    if (dto.title) update['title'] = await this._translationService.toTranslatedField(dto.title);
    if (dto.description) update['description'] = await this._translationService.toTranslatedField(dto.description);
    if (dto.order !== undefined) update['order'] = dto.order;
    if (Object.keys(update).length) {
      await this._legalItemRepository.update({ legalItemId }, update);
    }
  }

  async deleteItem(legalItemId: string) {
    await this._findItemOrFail(legalItemId);
    await this._legalItemRepository.delete({ legalItemId });
  }

  async addChild(legalItemId: string, dto: CreateLegalItemChildDto) {
    const item = await this._findItemOrFail(legalItemId);
    const content = await this._translationService.toTranslatedField(dto.content);
    const result = await this._legalItemChildRepository.insert({
      content,
      order: dto.order ?? 0,
      legalItem: item,
    });
    return { rowId: result.identifiers[0].legalItemChildId };
  }

  async updateChild(legalItemChildId: string, dto: UpdateLegalItemChildDto) {
    await this._findChildOrFail(legalItemChildId);
    const update: Record<string, unknown> = {};
    if (dto.content) update['content'] = await this._translationService.toTranslatedField(dto.content);
    if (dto.order !== undefined) update['order'] = dto.order;
    if (Object.keys(update).length) {
      await this._legalItemChildRepository.update({ legalItemChildId }, update);
    }
  }

  async deleteChild(legalItemChildId: string) {
    await this._findChildOrFail(legalItemChildId);
    await this._legalItemChildRepository.delete({ legalItemChildId });
  }

  async reorderItems(legalSectionId: string, dto: ReorderDto) {
    await this._findSectionOrFail(legalSectionId);
    await Promise.all(
      dto.items.map(({ id, order }) =>
        this._legalItemRepository.update({ legalItemId: id }, { order }),
      ),
    );
  }

  async reorderChildren(legalItemId: string, dto: ReorderDto) {
    await this._findItemOrFail(legalItemId);
    await Promise.all(
      dto.items.map(({ id, order }) =>
        this._legalItemChildRepository.update({ legalItemChildId: id }, { order }),
      ),
    );
  }
}
