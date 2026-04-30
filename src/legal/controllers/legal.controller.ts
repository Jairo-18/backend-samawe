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

  @Get('organizational/:organizationalId')
  async getAllSections(@Param('organizationalId') organizationalId: string) {
    const data = await this._legalUC.getAllSections(organizationalId);
    return { statusCode: HttpStatus.OK, data };
  }

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
}
