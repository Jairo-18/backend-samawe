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
import { BenefitSectionUC } from '../useCases/benefitSection.uc';
import {
  CreateBenefitSectionDto,
  UpdateBenefitSectionDto,
  CreateBenefitItemDto,
  UpdateBenefitItemDto,
} from '../dtos/benefitSection.dto';

@Controller('benefit-section')
@ApiTags('Beneficios y Servicios')
export class BenefitSectionController {
  constructor(private readonly _benefitSectionUC: BenefitSectionUC) {}

  @Get('organizational/:organizationalId')
  async getSections(@Param('organizationalId') organizationalId: string) {
    const data = await this._benefitSectionUC.getSections(organizationalId);
    return { statusCode: HttpStatus.OK, data };
  }

  @Post('organizational/:organizationalId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async createSection(
    @Param('organizationalId') organizationalId: string,
    @Body() dto: CreateBenefitSectionDto,
  ) {
    const data = await this._benefitSectionUC.createSection(
      organizationalId,
      dto,
    );
    return { statusCode: HttpStatus.CREATED, data };
  }

  @Patch(':benefitSectionId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async updateSection(
    @Param('benefitSectionId') benefitSectionId: string,
    @Body() dto: UpdateBenefitSectionDto,
  ) {
    await this._benefitSectionUC.updateSection(benefitSectionId, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Sección actualizada correctamente',
    };
  }

  @Delete(':benefitSectionId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async deleteSection(@Param('benefitSectionId') benefitSectionId: string) {
    await this._benefitSectionUC.deleteSection(benefitSectionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Sección eliminada correctamente',
    };
  }

  @Post(':benefitSectionId/items')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async addItem(
    @Param('benefitSectionId') benefitSectionId: string,
    @Body() dto: CreateBenefitItemDto,
  ) {
    const data = await this._benefitSectionUC.addItem(benefitSectionId, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @Patch('items/:benefitItemId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async updateItem(
    @Param('benefitItemId') benefitItemId: string,
    @Body() dto: UpdateBenefitItemDto,
  ) {
    await this._benefitSectionUC.updateItem(benefitItemId, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Item actualizado correctamente',
    };
  }

  @Delete('items/:benefitItemId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async deleteItem(@Param('benefitItemId') benefitItemId: string) {
    await this._benefitSectionUC.deleteItem(benefitItemId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Item eliminado correctamente',
    };
  }
}
