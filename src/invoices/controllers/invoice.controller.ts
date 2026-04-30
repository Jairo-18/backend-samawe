import { Response } from 'express';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PaginatedListInvoicesParamsDto } from './../dtos/paginatedInvoice.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateInvoiceDetailDto,
  TogglePaymentBulkDto,
  TogglePaymentBulkResponseDto,
  TogglePaymentResponseDto,
} from './../dtos/invoiceDetaill.dto';
import {
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
  CreateInvoiceDto,
} from './../dtos/invoice.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import {
  Controller,
  Post,
  HttpStatus,
  Body,
  Patch,
  Param,
  Delete,
  Get,
  UseGuards,
  Query,
  Request,
  ParseArrayPipe,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GetPaginatedListDocs,
  CreateInvoiceDocs,
  FindOneInvoiceDocs,
  DeleteInvoiceDocs,
  CreateDetailsDocs,
  UpdateInvoiceDocs,
  DeleteDetailDocs,
  ToggleDetailPaymentDocs,
  ToggleDetailPaymentBulkDocs,
  ExportTransferInvoicesExcelDocs,
  ExportSelectedInvoicesExcelDocs,
} from '../decorators/invoice.decorators';
import { InvoiceUC } from '../useCases/invoiceUC.uc';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

const STAFF_ROLES = [
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
];
const ALL_ROLES = [...STAFF_ROLES, RolesUser.USER, RolesUser.PRO];

@Controller('invoices')
@ApiTags('Facturas')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(...ALL_ROLES)
export class InvoiceController {
  constructor(private readonly _invoiceUC: InvoiceUC) {}

  @Get('/paginated-list')
  @Roles(...STAFF_ROLES)
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListInvoicesParamsDto,
  ): Promise<ResponsePaginationDto<Invoice>> {
    return await this._invoiceUC.paginatedList(params);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @CreateInvoiceDocs()
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Request() req: any,
  ): Promise<CreatedRecordResponseDto> {
    const employeeId = req.user.userId;
    const rowId = await this._invoiceUC.createInvoice(
      createInvoiceDto,
      employeeId,
    );
    return {
      title: 'api.invoice.created_title',
      message: 'api.invoice.created',
      statusCode: HttpStatus.CREATED,
      data: { rowId: rowId.invoiceId.toString() },
    };
  }

  @Get(':id')
  @FindOneInvoiceDocs()
  async findOne(
    @Param('id') invoiceId: number,
  ): Promise<{ statusCode: number; data: GetInvoiceWithDetailsDto }> {
    const invoice = await this._invoiceUC.findOne(invoiceId);
    return { statusCode: HttpStatus.OK, data: invoice };
  }

  @Delete(':id')
  @DeleteInvoiceDocs()
  async remove(
    @Param('id') invoiceId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._invoiceUC.delete(invoiceId);
    return {
      title: 'api.invoice.deleted_title',
      statusCode: HttpStatus.OK,
      message: 'api.invoice.deleted',
    };
  }

  @Post('invoice/:invoiceId/details')
  @CreateDetailsDocs()
  async createDetails(
    @Param('invoiceId') invoiceId: number,
    @Body(new ParseArrayPipe({ items: CreateInvoiceDetailDto }))
    dtos: CreateInvoiceDetailDto[],
  ): Promise<CreatedRecordResponseDto> {
    await this._invoiceUC.addDetails(invoiceId, dtos);
    return {
      title: 'api.invoice.items_added_title',
      message: 'api.invoice.items_added',
      statusCode: HttpStatus.CREATED,
      data: null,
    };
  }

  @Patch(':id')
  @UpdateInvoiceDocs()
  async update(
    @Param('id') invoiceId: number,
    @Body() invoiceData: UpdateInvoiceDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._invoiceUC.update({ invoiceId, ...invoiceData });
    return {
      title: 'api.invoice.updated_title',
      message: 'api.invoice.updated',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete('details/:detailId')
  @DeleteDetailDocs()
  async deleteDetail(
    @Param('detailId') deleteDetailDto: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._invoiceUC.deleteDetail(deleteDetailDto);
    return {
      title: 'api.invoice.item_deleted_title',
      message: 'api.invoice.item_deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch('invoice/:invoiceId/detail/:detailId/toggle-payment')
  @Roles(...STAFF_ROLES)
  @ToggleDetailPaymentDocs()
  async toggleDetailPayment(
    @Param('invoiceId') invoiceId: number,
    @Param('detailId') detailId: number,
  ): Promise<{
    title: string;
    message: string;
    statusCode: number;
    data: TogglePaymentResponseDto;
  }> {
    const result = await this._invoiceUC.toggleDetailPayment(
      invoiceId,
      detailId,
    );
    return {
      title: 'api.invoice.payment_title',
      message: result.isPaid
        ? 'api.invoice.payment_paid'
        : 'api.invoice.payment_pending',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Patch('invoice/:invoiceId/details/toggle-payment-bulk')
  @Roles(...STAFF_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ToggleDetailPaymentBulkDocs()
  async toggleDetailPaymentBulk(
    @Param('invoiceId') invoiceId: number,
    @Body() body: TogglePaymentBulkDto,
  ): Promise<{
    title: string;
    message: string;
    statusCode: number;
    data: TogglePaymentBulkResponseDto;
  }> {
    const result = await this._invoiceUC.toggleDetailPaymentBulk(
      invoiceId,
      body.detailIds,
      body.isPaid,
    );
    return {
      title: 'api.invoice.items_updated_title',
      message: 'api.invoice.items_updated',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get('transfer/excel')
  @Roles(...STAFF_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ExportTransferInvoicesExcelDocs()
  async exportTransferInvoicesExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const invoices = await this._invoiceUC.getTransferInvoices(
      startDate,
      endDate,
    );
    const buffer = await this._invoiceUC.excelService.buildBuffer(invoices);
    const fecha = this._buildFechaStamp();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Facturas_Transferencia_${fecha}.xlsx`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Post('selected/excel')
  @Roles(...STAFF_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ExportSelectedInvoicesExcelDocs()
  async exportSelectedInvoicesExcel(
    @Body() body: { invoiceIds: number[] },
    @Res() res: Response,
  ) {
    const invoices = await this._invoiceUC.getInvoicesByIds(body.invoiceIds);
    const buffer = await this._invoiceUC.excelService.buildBuffer(invoices);
    const fecha = this._buildFechaStamp();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Facturas_Seleccionadas_${fecha}.xlsx`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  private _buildFechaStamp(): string {
    const now = new Date();
    return (
      now.toLocaleDateString('es-CO').replace(/\//g, '-') +
      '_' +
      now.toLocaleTimeString('es-CO', { hour12: false }).replace(/:/g, '-')
    );
  }
}
