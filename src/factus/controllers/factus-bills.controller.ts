import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusBillsService } from '../services/factus-bills.service';
import { CreateBillOptions, FactusBillResult } from '../interfaces/bill.interfaces';

@ApiTags('Factus - Bills')
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
@Controller('factus/bills')
export class FactusBillsController {
  constructor(private readonly billsService: FactusBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear y validar factura electrónica en Factus (payload simplificado)' })
  async createBill(@Body() body: CreateBillOptions) {
    const payload = this.billsService.buildBillPayload(body);
    const raw = await this.billsService.createAndValidateBill(payload);
    return { success: true, data: this.extractBillData(raw) };
  }

  @Post('raw')
  @ApiOperation({ summary: 'Enviar payload completo directo a Factus sin transformación' })
  async createBillRaw(@Body() body: Record<string, unknown>) {
    const raw = await this.billsService.createAndValidateBill(body);
    return { success: true, data: this.extractBillData(raw) };
  }

  @Get(':ref')
  @ApiOperation({ summary: 'Consultar factura por reference_code' })
  async getBillByReference(@Param('ref') ref: string) {
    return this.billsService.getBillByReference(ref);
  }

  private extractBillData(raw: any): FactusBillResult & { publicUrl?: string } {
    const bill = raw?.data?.bill ?? raw?.data ?? raw;
    return {
      billNumber: bill?.number ?? bill?.bill_number ?? null,
      referenceCode: bill?.reference_code ?? null,
      isValidated: bill?.is_validated ?? false,
      cufe: bill?.cufe ?? null,
      qrCode: bill?.links?.qr ?? bill?.qr_code ?? bill?.qrCode ?? null,
      publicUrl: bill?.links?.public_url ?? null,
      createdAt: bill?.created_at ?? bill?.createdAt ?? new Date().toISOString(),
    };
  }
}
