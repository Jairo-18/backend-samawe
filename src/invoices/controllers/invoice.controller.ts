import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InvoiceDetaillMultiple } from './../services/invoiceDetaillMultiple.service';
import { PaginatedListInvoicesParamsDto } from './../dtos/paginatedInvoice.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateMultipleInvoiceDetailsDto,
  CreateRelatedDataInvoiceResponseDto,
} from './../dtos/invoiceDetaill.dto';
import {
  GetInvoiceWithDetailsResponseDto,
  GetInvoiceWithDetailsDto,
  UpdateInvoiceDto,
  CreateInvoiceDto,
} from './../dtos/invoice.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  SimpleSuccessResponseDto,
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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceUC } from '../useCases/invoiceUC.uc';
import { AuthGuard } from '@nestjs/passport';

@Controller('invoices')
@ApiTags('Facturas')
export class InvoiceController {
  constructor(
    private readonly _invoiceUC: InvoiceUC,
    private readonly _invoiceDetaillMultiple: InvoiceDetaillMultiple,
  ) {}

  @Get('/paginated-list')
  @ApiOkResponse({ type: ResponsePaginationDto<Invoice> })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedList(
    @Query() params: PaginatedListInvoicesParamsDto,
  ): Promise<ResponsePaginationDto<Invoice>> {
    return await this._invoiceUC.paginatedList(params);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateInvoiceDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Request() req: any,
  ): Promise<CreatedRecordResponseDto> {
    const employeeId = req.user.userId;

    const created = await this._invoiceUC.createInvoice(
      createInvoiceDto,
      employeeId,
    );

    return {
      message: 'Factura registrada',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: created.invoiceId.toString(),
        ...created,
      },
    };
  }

  @Get('/create/related-data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateRelatedDataInvoiceResponseDto })
  async getRelatedData(): Promise<CreateRelatedDataInvoiceResponseDto> {
    const data = await this._invoiceUC.getRelatedDataToCreate();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetInvoiceWithDetailsResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
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
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async remove(
    @Param('id') invoiceId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._invoiceUC.delete(invoiceId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Factura eliminada exitosamente',
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UpdateRecordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async update(
    @Param('id') invoiceId: number,
    @Body() invoiceData: UpdateInvoiceDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._invoiceUC.update({ invoiceId, ...invoiceData });

    return {
      statusCode: HttpStatus.OK,
    };
  }

  @Post('invoice/:invoiceId/details/bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiBody({ type: CreateMultipleInvoiceDetailsDto }) // ✅ muestra el body esperado
  @ApiOkResponse({ type: SimpleSuccessResponseDto }) // ✅ muestra la respuesta
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async createBulkDetails(
    @Param('invoiceId') invoiceId: number,
    @Body() createMultipleDetailsDto: CreateMultipleInvoiceDetailsDto,
  ): Promise<SimpleSuccessResponseDto> {
    await this._invoiceDetaillMultiple.createMultipleDetails(
      invoiceId,
      createMultipleDetailsDto.details,
    );

    return {
      message: 'Factura guardada',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete('details/:detailId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async deleteDetail(
    @Param('detailId') deleteDetailDto: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._invoiceUC.deleteDetail(deleteDetailDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Detalle eliminado correctamente',
    };
  }
}
