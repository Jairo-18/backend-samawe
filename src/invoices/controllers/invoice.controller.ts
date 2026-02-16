import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  PaginatedInvoiceResponseDto,
  PaginatedListInvoicesParamsDto,
} from './../dtos/paginatedInvoice.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateInvoiceDetailDto,
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
  constructor(private readonly _invoiceUC: InvoiceUC) {}

  @Get('/paginated-list')
  @ApiOkResponse({ type: PaginatedInvoiceResponseDto })
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
      title: 'Factura eliminada',
      statusCode: HttpStatus.OK,
      message: 'Factura eliminada exitosamente',
    };
  }

  @Post('invoice/:invoiceId/details')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiBody({ type: CreateInvoiceDetailDto })
  async createSingleDetail(
    @Param('invoiceId') invoiceId: number,
    @Body() dto: CreateInvoiceDetailDto,
  ): Promise<CreatedRecordResponseDto> {
    await this._invoiceUC.addDetail(invoiceId, dto);

    return {
      title: 'Item agregado',
      message: 'Item agregado exitosamente',
      statusCode: HttpStatus.CREATED,
      data: null,
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
      title: 'Factura editada',
      message: 'Factura editada exitosamente',
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
      title: 'Item eliminado',
      message: 'Item eliminado correctamente',
      statusCode: HttpStatus.OK,
    };
  }
}
