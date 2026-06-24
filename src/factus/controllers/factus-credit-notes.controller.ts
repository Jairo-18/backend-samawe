import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusCreditNoteService } from '../services/factus-credit-note.service';

class CreditNoteItemDto {
  @IsInt()
  invoiceDetailId: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;
}

class CreateCreditNoteDto {
  @IsOptional()
  @IsString()
  correctionConceptCode?: string;

  @IsOptional()
  @IsBoolean()
  isTotal?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items?: CreditNoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observation?: string;
}

@ApiTags('Factus - Credit Notes')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.PRO,
  RolesUser.CHE,
  RolesUser.MES,
  RolesUser.EMP,
) // Todos menos USER
@Controller('factus/invoices')
export class FactusCreditNotesController {
  constructor(
    private readonly creditNoteService: FactusCreditNoteService,
  ) {}

  @Post(':id/credit-notes')
  @ApiOperation({
    summary: 'Generar y validar una nota crédito sobre una factura electrónica',
  })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateCreditNoteDto,
  ) {
    const data = await this.creditNoteService.createForInvoice(id, body);
    return { success: true, data };
  }

  @Get(':id/credit-notes')
  @ApiOperation({ summary: 'Listar las notas crédito de una factura' })
  async list(@Param('id', ParseIntPipe) id: number) {
    const data = await this.creditNoteService.listForInvoice(id);
    return { success: true, data };
  }
}
