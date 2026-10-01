import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { InvoiceCreditService } from '../services/invoiceCredit.service';

@Controller('receivables')
@ApiTags('Facturas - Cuentas por cobrar')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
export class ReceivablesController {
  constructor(private readonly _creditService: InvoiceCreditService) {}

  @Get()
  @ApiOperation({
    summary: 'Facturas de venta a crédito con saldo pendiente',
  })
  async list(@Query('includePaid') includePaid?: string) {
    return {
      statusCode: 200,
      data: await this._creditService.listReceivables(includePaid === 'true'),
    };
  }
}
