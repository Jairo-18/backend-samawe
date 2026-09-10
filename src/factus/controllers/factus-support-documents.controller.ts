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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusSupportDocumentService } from '../services/factus-support-document.service';

@ApiTags('Factus - Support Documents')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Controller('factus')
export class FactusSupportDocumentsController {
  constructor(
    private readonly supportDocumentService: FactusSupportDocumentService,
  ) {}

  @Post('invoices/:id/support-document')
  // Solo administración: `PRO` es el rol PROVEEDOR, y el proveedor es
  // justamente la contraparte del documento soporte — no puede emitírselo.
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary:
      'Emitir el documento soporte de una factura de compra (adquisiciones a no obligados a facturar)',
  })
  async emit(@Param('id', ParseIntPipe) id: number) {
    const data = await this.supportDocumentService.emitForInvoice(id);
    return { success: true, data };
  }

  @Get('invoices/:id/support-document')
  // Solo administración: `PRO` es el rol PROVEEDOR, y el proveedor es
  // justamente la contraparte del documento soporte — no puede emitírselo.
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Estado del documento soporte de una compra (solo lectura)',
  })
  async status(@Param('id', ParseIntPipe) id: number) {
    const data = await this.supportDocumentService.getStatus(id);
    return { success: true, data };
  }

  /**
   * Destructivo y solo para documentos NO validados: es el procedimiento
   * oficial ante un rechazo de la DIAN. Un documento ya validado no se elimina,
   * se corrige con una nota de ajuste.
   */
  @Delete('support-documents/by-reference/:referenceCode')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary: 'Eliminar en Factus un documento soporte NO validado por su referencia',
  })
  async deleteByReference(@Param('referenceCode') referenceCode: string) {
    const data =
      await this.supportDocumentService.deleteByReference(referenceCode);
    return { success: true, data };
  }
}
