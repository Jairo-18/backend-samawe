import {
  CreatedRecordResponseDto,
  DuplicatedResponseDto,
} from './../../shared/dtos/response.dto';
import { Controller, Post, HttpStatus, Body } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateInvoiceDto } from '../dtos/invoice.dto';
import { InvoiceUC } from '../useCases/invoiceUC.uc';

@Controller('invoice')
@ApiTags('Facturas')
export class InvoiceController {
  constructor(private readonly _invoiceUC: InvoiceUC) {}

  @Post('create')
  //   @ApiBearerAuth()
  //   @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreateInvoiceDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() invoiceDto: CreateInvoiceDto,
  ): Promise<CreatedRecordResponseDto> {
    const createExcursion = await this._invoiceUC.create(invoiceDto);

    return {
      message: 'Registro de factura exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createExcursion.invoiceId.toString(),
        ...createExcursion,
      },
    };
  }
}
