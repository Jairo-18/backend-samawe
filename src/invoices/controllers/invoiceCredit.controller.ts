import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import {
  CreateInvoicePaymentDto,
  SetInvoiceCreditDto,
} from '../dtos/invoiceCredit.dto';
import { InvoiceCreditService } from '../services/invoiceCredit.service';

@Controller('invoices/:invoiceId/credit')
@ApiTags('Facturas - Crédito')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
export class InvoiceCreditController {
  constructor(private readonly _creditService: InvoiceCreditService) {}

  @Get()
  @ApiOperation({
    summary: 'Plazo, cuotas, abonos y saldo de una factura a crédito',
  })
  async get(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return {
      statusCode: 200,
      data: await this._creditService.getCredit(invoiceId),
    };
  }

  @Put()
  @ApiOperation({ summary: 'Define el plazo de crédito (30, 60 o 90 días)' })
  async setCredit(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: SetInvoiceCreditDto,
  ) {
    return {
      statusCode: 200,
      data: await this._creditService.setCredit(invoiceId, dto),
    };
  }

  @Post('payments')
  @ApiOperation({ summary: 'Registra un abono' })
  async addPayment(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() dto: CreateInvoicePaymentDto,
    @Request() req: any,
  ) {
    return {
      statusCode: 201,
      data: await this._creditService.addPayment(
        invoiceId,
        dto,
        req.user.userId,
      ),
    };
  }

  @Delete('payments/:paymentId')
  @ApiOperation({ summary: 'Elimina un abono registrado por error' })
  async deletePayment(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ) {
    return {
      statusCode: 200,
      data: await this._creditService.deletePayment(invoiceId, paymentId),
    };
  }
}
