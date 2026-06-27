import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusInvoiceService } from '../services/factus-invoice.service';

@ApiTags('Factus - Invoices')
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
export class FactusInvoiceController {
  constructor(private readonly invoiceService: FactusInvoiceService) {}

  @Post(':id/send')
  @ApiOperation({
    summary: 'Enviar factura interna a Factus (DIAN)',
    description:
      'Mapea la factura del sistema a formato Factus, la envía a la DIAN y guarda ' +
      'el número, CUFE y QR de vuelta en la factura. Si ya fue enviada, retorna los datos guardados.',
  })
  async sendInvoice(@Param('id', ParseIntPipe) id: number) {
    const result = await this.invoiceService.sendInvoiceToFactus(id);
    return { success: true, data: result };
  }

  @Post(':id/recover')
  @ApiOperation({
    summary: 'Recuperar factura ya procesada por la DIAN (Regla 90)',
    description:
      'Úsalo cuando la DIAN ya procesó la factura (error "Regla 90 — Documento procesado anteriormente") ' +
      'pero el resultado nunca se guardó en el sistema. Busca la factura en Factus por reference_code, ' +
      'extrae el número, CUFE, QR y los sincroniza a la BD local. ' +
      'Después de esto la factura queda marcada como electrónica normalmente.',
  })
  async recoverInvoice(@Param('id', ParseIntPipe) id: number) {
    const result = await this.invoiceService.recoverFromFactus(id);
    return { success: true, recovered: true, data: result };
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Consultar estado Factus de una factura interna (solo lectura)',
    description:
      'Devuelve los datos Factus guardados (número, CUFE, QR, etc.) sin enviar ' +
      'nada a la DIAN. Para emitir la factura use POST :id/send.',
  })
  async getStatus(@Param('id', ParseIntPipe) id: number) {
    const result = await this.invoiceService.getFactusStatus(id);
    return { success: true, data: result };
  }
}
