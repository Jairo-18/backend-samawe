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
  ArrayMinSize,
  IsArray,
  IsIn,
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
import { FactusDebitNoteService } from '../services/factus-debit-note.service';

class DebitNoteItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxCode?: string;
}

class CreateDebitNoteDto {
  /** '1' intereses · '2' gastos por cobrar · '3' cambio del valor · '4' otros. */
  @IsOptional()
  @IsIn(['1', '2', '3', '4'])
  correctionConceptCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteItemDto)
  items: DebitNoteItemDto[];

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

@ApiTags('Factus - Debit Notes')
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
) // Todos menos USER, igual que las notas crédito
// Base `factus` para poder colgar también las rutas que no van por factura.
// Las de factura llevan el prefijo explícito: las URLs públicas no cambian.
@Controller('factus')
export class FactusDebitNotesController {
  constructor(private readonly debitNoteService: FactusDebitNoteService) {}

  @Post('invoices/:id/debit-notes')
  @ApiOperation({
    summary: 'Generar y validar una nota débito sobre una factura electrónica',
  })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateDebitNoteDto,
  ) {
    const data = await this.debitNoteService.createForInvoice(id, body);
    return { success: true, data };
  }

  @Get('invoices/:id/debit-notes')
  @ApiOperation({ summary: 'Listar las notas débito de una factura' })
  async list(@Param('id', ParseIntPipe) id: number) {
    const data = await this.debitNoteService.listForInvoice(id);
    return { success: true, data };
  }

  /**
   * Registra una nota débito ya VALIDADA en la DIAN que nunca se guardó aquí
   * (típicamente tras una Regla 90). No emite nada. El cuerpo es el mismo que
   * el de la emisión: de los conceptos sale el `reference_code`.
   */
  @Post('invoices/:id/debit-notes/recover')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary:
      'Recuperar de Factus una nota débito ya validada que no quedó registrada',
  })
  async recover(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateDebitNoteDto,
  ) {
    const data = await this.debitNoteService.recoverForInvoice(id, body);
    return { success: true, data };
  }

  /**
   * Endpoint destructivo: solo notas NO validadas, que son las que bloquean los
   * envíos con 409.
   *
   * ⚠️ NO sirve ante Regla 90 ("documento procesado anteriormente"): la DIAN ya
   * tiene el documento y borrarlo aquí no lo borra allá.
   */
  @Delete('debit-notes/by-reference/:referenceCode')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Eliminar en Factus una nota débito no validada, por referencia',
  })
  async deleteByReference(@Param('referenceCode') referenceCode: string) {
    const data = await this.debitNoteService.deleteByReference(referenceCode);
    return { success: true, data };
  }
}
