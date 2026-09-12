import {
  Body,
  Controller,
  Delete,
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
  IsIn,
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
import { FactusAdjustmentNoteService } from '../services/factus-adjustment-note.service';

class AdjustmentNoteItemDto {
  @IsInt()
  invoiceDetailId: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;
}

class CreateAdjustmentNoteDto {
  /** '1' devolución · '2' anulación · '3' rebaja · '4' ajuste de precio · '5' otros. */
  @IsOptional()
  @IsIn(['1', '2', '3', '4', '5'])
  correctionConceptCode?: string;

  @IsOptional()
  @IsBoolean()
  isTotal?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentNoteItemDto)
  items?: AdjustmentNoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observation?: string;
}

@ApiTags('Factus - Adjustment Notes')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Controller('factus')
export class FactusAdjustmentNotesController {
  constructor(
    private readonly adjustmentNoteService: FactusAdjustmentNoteService,
  ) {}

  @Post('invoices/:id/adjustment-notes')
  @Roles(
    RolesUser.SUPERADMIN,
    RolesUser.ADMIN,
    RolesUser.PRO,
    RolesUser.EMP,
  ) // Compras: sin cocina ni meseros, igual que el documento soporte
  @ApiOperation({
    summary:
      'Generar y validar una nota de ajuste sobre un documento soporte emitido',
  })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateAdjustmentNoteDto,
  ) {
    const data = await this.adjustmentNoteService.createForInvoice(id, body);
    return { success: true, data };
  }

  @Get('invoices/:id/adjustment-notes')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.PRO, RolesUser.EMP)
  @ApiOperation({
    summary: 'Listar las notas de ajuste de un documento soporte',
  })
  async list(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adjustmentNoteService.listForInvoice(id);
    return { success: true, data };
  }

  /**
   * Endpoint destructivo: solo elimina notas NO validadas por la DIAN, que son
   * las que bloquean los envíos siguientes con 409. Una nota validada es
   * inmutable. Restringido a SUPERADMIN/ADMIN igual que el borrado de facturas.
   */
  @Delete('adjustment-notes/by-reference/:referenceCode')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Eliminar en Factus una nota de ajuste no validada, por referencia',
  })
  async deleteByReference(@Param('referenceCode') referenceCode: string) {
    const data = await this.adjustmentNoteService.deleteByReference(
      referenceCode,
    );
    return { success: true, data };
  }
}
