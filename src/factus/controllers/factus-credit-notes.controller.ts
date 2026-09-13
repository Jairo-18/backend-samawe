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

  /** Solo para /recover: reference_code real del documento en Factus. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceCode?: string;
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
// Base `factus` (no `factus/invoices`) para poder colgar aquí también las rutas
// que NO van por factura, como el borrado por referencia. Las rutas de factura
// llevan el prefijo explícito, así que las URLs públicas no cambian.
@Controller('factus')
export class FactusCreditNotesController {
  constructor(
    private readonly creditNoteService: FactusCreditNoteService,
  ) {}

  @Post('invoices/:id/credit-notes')
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

  @Get('invoices/:id/credit-notes')
  @ApiOperation({ summary: 'Listar las notas crédito de una factura' })
  async list(@Param('id', ParseIntPipe) id: number) {
    const data = await this.creditNoteService.listForInvoice(id);
    return { success: true, data };
  }

  /**
   * Registra una nota crédito que ya existe y está VALIDADA en la DIAN pero que
   * nunca se guardó aquí (típicamente tras una Regla 90: el envío llegó y se
   * perdió la respuesta). No emite nada ante la DIAN.
   *
   * El cuerpo es el MISMO que el de la emisión: de la selección de ítems sale
   * el `reference_code` con el que se busca la nota en Factus.
   */
  @Post('invoices/:id/credit-notes/recover')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary:
      'Recuperar de Factus una nota crédito ya validada que no quedó registrada',
  })
  async recover(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateCreditNoteDto,
  ) {
    const data = await this.creditNoteService.recoverForInvoice(id, body);
    return { success: true, data };
  }

  /**
   * Endpoint destructivo: solo elimina notas NO validadas por la DIAN, que son
   * las que bloquean los envíos siguientes con 409.
   *
   * ⚠️ NO sirve para una nota con Regla 90 ("documento procesado
   * anteriormente"): esa la DIAN ya la tiene, y borrarla aquí solo destruye el
   * vínculo con un documento que existe legalmente. Ese caso se reconcilia con
   * soporte de Factus.
   */
  @Delete('credit-notes/by-reference/:referenceCode')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Eliminar en Factus una nota crédito no validada, por referencia',
  })
  async deleteByReference(@Param('referenceCode') referenceCode: string) {
    const data = await this.creditNoteService.deleteByReference(referenceCode);
    return { success: true, data };
  }
}
