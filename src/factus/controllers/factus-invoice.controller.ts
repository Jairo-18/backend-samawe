import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Delete('by-reference/:referenceCode')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Eliminar de Factus una factura NO validada (desbloquea la DIAN)',
    description:
      'Cuando la DIAN rechaza una factura, el documento se queda atascado en Factus ' +
      'y bloquea cualquier emisión nueva con 409 ("factura pendiente por enviar a la DIAN"). ' +
      'Este endpoint lo elimina por su reference_code y limpia los campos Factus de la ' +
      'factura interna, para poder reenviarla con el MISMO código. ' +
      'Se niega a borrar facturas ya validadas (con CUFE): esas solo se anulan con nota crédito. ' +
      'Ojo: si la factura no está validada pero TAMPOCO fue rechazada, es que la DIAN va ' +
      'demorada — en ese caso NO la elimines, reintenta el envío.',
  })
  async deleteByReference(@Param('referenceCode') referenceCode: string) {
    const result =
      await this.invoiceService.deleteFactusBillByReference(referenceCode);
    return { success: true, ...result };
  }

  @Post(':id/reset-factus')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: '⚠️ Limpiar campos Factus de una factura (sandbox → prod)',
    description:
      'Borra factusNumber, CUFE, QR y publicUrl de la factura para poder reenviarla a Factus prod. ' +
      'SOLO úsalo si la factura tiene un número de SANDBOX (SETP…) y confirmaste en el portal de ' +
      'Factus que NO existe en producción. Si la DIAN ya la tiene, usa POST :id/recover en cambio.',
  })
  async resetFactus(@Param('id', ParseIntPipe) id: number) {
    const result = await this.invoiceService.resetFactusFields(id);
    return { success: true, ...result };
  }
}
