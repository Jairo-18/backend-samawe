import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LegalUC } from '../useCases/legal.uc';
import {
  CreateLegalSectionDto,
  CreateLegalItemDto,
  UpdateLegalItemDto,
  CreateLegalItemChildDto,
  UpdateLegalItemChildDto,
  ReorderDto,
} from '../dtos/legal.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { OwnedBy } from '../../tenant/owned-by';
import { LegalItem } from '../../shared/entities/legalItem.entity';
import { LegalItemChild } from '../../shared/entities/legalItemChild.entity';
import { LegalSection } from '../../shared/entities/legalSection.entity';
import { Organizational } from '../../shared/entities/organizational.entity';

@Controller('legal')
@ApiTags('Términos y Privacidad')
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
)
export class LegalController {
  constructor(private readonly _legalUC: LegalUC) {}

  // Lectura PÚBLICA del contenido de la organización del id (web y panel):
  // sin @OwnedBy, sirve igual con o sin sesión de otro hotel.
  @Get('organizational/:organizationalId')
  async getAllSections(@Param('organizationalId') organizationalId: string) {
    const data = await this._legalUC.getAllSections(organizationalId);
    return { statusCode: HttpStatus.OK, data };
  }

  @OwnedBy({ entity: Organizational, param: 'organizationalId' })
  @Post('organizational/:organizationalId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async createSection(
    @Param('organizationalId') organizationalId: string,
    @Body() dto: CreateLegalSectionDto,
  ) {
    const data = await this._legalUC.createSection(organizationalId, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @OwnedBy({ entity: LegalSection, param: 'legalSectionId' })
  @Delete(':legalSectionId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteSection(@Param('legalSectionId') legalSectionId: string) {
    await this._legalUC.deleteSection(legalSectionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.legal.section_deleted',
    };
  }

  @OwnedBy({ entity: LegalSection, param: 'legalSectionId' })
  @Post(':legalSectionId/items')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async addItem(
    @Param('legalSectionId') legalSectionId: string,
    @Body() dto: CreateLegalItemDto,
  ) {
    const data = await this._legalUC.addItem(legalSectionId, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @OwnedBy(
    { entity: LegalItem, param: 'legalItemId', via: ['legalSection'] },
  )
  @Patch('items/:legalItemId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async updateItem(
    @Param('legalItemId') legalItemId: string,
    @Body() dto: UpdateLegalItemDto,
  ) {
    await this._legalUC.updateItem(legalItemId, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.legal.item_updated',
    };
  }

  @OwnedBy(
    { entity: LegalItem, param: 'legalItemId', via: ['legalSection'] },
  )
  @Delete('items/:legalItemId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteItem(@Param('legalItemId') legalItemId: string) {
    await this._legalUC.deleteItem(legalItemId);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.legal.item_deleted',
    };
  }

  @OwnedBy(
    { entity: LegalItem, param: 'legalItemId', via: ['legalSection'] },
  )
  @Post('items/:legalItemId/children')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async addChild(
    @Param('legalItemId') legalItemId: string,
    @Body() dto: CreateLegalItemChildDto,
  ) {
    const data = await this._legalUC.addChild(legalItemId, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @OwnedBy(
    { entity: LegalItemChild, param: 'legalItemChildId', via: ['legalItem', 'legalSection'] },
  )
  @Patch('children/:legalItemChildId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async updateChild(
    @Param('legalItemChildId') legalItemChildId: string,
    @Body() dto: UpdateLegalItemChildDto,
  ) {
    await this._legalUC.updateChild(legalItemChildId, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.legal.subitem_updated',
    };
  }

  @OwnedBy(
    { entity: LegalItemChild, param: 'legalItemChildId', via: ['legalItem', 'legalSection'] },
  )
  @Delete('children/:legalItemChildId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteChild(@Param('legalItemChildId') legalItemChildId: string) {
    await this._legalUC.deleteChild(legalItemChildId);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.legal.subitem_deleted',
    };
  }

  @OwnedBy({ entity: LegalSection, param: 'legalSectionId' })
  @Patch(':legalSectionId/items/reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async reorderItems(
    @Param('legalSectionId') legalSectionId: string,
    @Body() dto: ReorderDto,
  ) {
    await this._legalUC.reorderItems(legalSectionId, dto);
    return { statusCode: HttpStatus.OK };
  }

  @OwnedBy(
    { entity: LegalItem, param: 'legalItemId', via: ['legalSection'] },
  )
  @Patch('items/:legalItemId/children/reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async reorderChildren(
    @Param('legalItemId') legalItemId: string,
    @Body() dto: ReorderDto,
  ) {
    await this._legalUC.reorderChildren(legalItemId, dto);
    return { statusCode: HttpStatus.OK };
  }

  @Post('backfill-translations')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async backfillTranslations() {
    const data = await this._legalUC.backfillTranslations();
    return { statusCode: HttpStatus.OK, data };
  }
}
