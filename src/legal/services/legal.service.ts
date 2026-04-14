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

@Injectable()
export class LegalService {
  constructor(
    private readonly _legalSectionRepository: LegalSectionRepository,
    private readonly _legalItemRepository: LegalItemRepository,
    private readonly _legalItemChildRepository: LegalItemChildRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
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
        const itemResult = await this._legalItemRepository.insert({
          title: itemDto.title,
          description: itemDto.description,
          order: itemDto.order ?? i,
          legalSection: section,
        });
        const legalItemId = itemResult.identifiers[0].legalItemId as string;
        if (itemDto.children?.length) {
          const item = await this._findItemOrFail(legalItemId);
          await this._legalItemChildRepository.insert(
            itemDto.children.map((c, j) => ({
              content: c.content,
              order: c.order ?? j,
              legalItem: item,
            })),
          );
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

    const result = await this._legalItemRepository.insert({
      title: dto.title,
      description: dto.description,
      order: dto.order ?? 0,
      legalSection: section,
    });
    const legalItemId = result.identifiers[0].legalItemId as string;

    if (dto.children?.length) {
      const item = await this._findItemOrFail(legalItemId);
      await this._legalItemChildRepository.insert(
        dto.children.map((c, j) => ({
          content: c.content,
          order: c.order ?? j,
          legalItem: item,
        })),
      );
    }

    return { rowId: legalItemId };
  }

  async updateItem(legalItemId: string, dto: UpdateLegalItemDto) {
    await this._findItemOrFail(legalItemId);
    await this._legalItemRepository.update({ legalItemId }, { ...dto });
  }

  async deleteItem(legalItemId: string) {
    await this._findItemOrFail(legalItemId);
    await this._legalItemRepository.delete({ legalItemId });
  }

  async addChild(legalItemId: string, dto: CreateLegalItemChildDto) {
    const item = await this._findItemOrFail(legalItemId);
    const result = await this._legalItemChildRepository.insert({
      content: dto.content,
      order: dto.order ?? 0,
      legalItem: item,
    });
    return { rowId: result.identifiers[0].legalItemChildId };
  }

  async updateChild(legalItemChildId: string, dto: UpdateLegalItemChildDto) {
    await this._findChildOrFail(legalItemChildId);
    await this._legalItemChildRepository.update({ legalItemChildId }, { ...dto });
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
