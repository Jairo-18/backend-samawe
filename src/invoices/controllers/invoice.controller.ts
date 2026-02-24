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
} from '../decorators/invoice.decorators';
import { InvoiceUC } from '../useCases/invoiceUC.uc';
import { AuthGuard } from '@nestjs/passport';

@Controller('invoices')
@ApiTags('Facturas')
@UseGuards(AuthGuard())
export class InvoiceController {
  constructor(private readonly _invoiceUC: InvoiceUC) {}

  @Get('/paginated-list')
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListInvoicesParamsDto,
  ): Promise<ResponsePaginationDto<Invoice>> {
    return await this._invoiceUC.paginatedList(params);
  }

  @Post()
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
      title: 'Factura creada',
      message: 'Factura registrada',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: rowId.invoiceId.toString(),
      },
    };
  }

  @Get(':id')
  @FindOneInvoiceDocs()
  async findOne(
    @Param('id') invoiceId: number,
  ): Promise<{ statusCode: number; data: GetInvoiceWithDetailsDto }> {
    const invoice = await this._invoiceUC.findOne(invoiceId);
    return {
      statusCode: HttpStatus.OK,
      data: invoice,
    };
  }

  @Delete(':id')
  @DeleteInvoiceDocs()
  async remove(
    @Param('id') invoiceId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._invoiceUC.delete(invoiceId);
    return {
      title: 'Factura eliminada',
      statusCode: HttpStatus.OK,
      message: 'Factura eliminada exitosamente',
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
      title: 'Items agregados',
      message: 'Items agregados exitosamente',
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
      title: 'Factura editada',
      message: 'Factura editada exitosamente',
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
      title: 'Item eliminado',
      message: 'Item eliminado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch('invoice/:invoiceId/detail/:detailId/toggle-payment')
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
      title: 'Estado de pago actualizado',
      message: result.isPaid
        ? 'Item marcado como pagado'
        : 'Item marcado como pendiente',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Patch('invoice/:invoiceId/details/toggle-payment-bulk')
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
      title: 'Estados de pago actualizados',
      message: 'Items actualizados exitosamente',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }
}
