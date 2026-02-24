import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { GeneralStatisticsDto } from '../dtos/generalStatistics.dto';
import {
  BalanceProductSummaryDto,
  AllInvoiceSummariesDto,
  ProductStockCountDto,
  InvoiceChartListDto,
} from '../dtos/earning.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { LowAmountProductDto } from './../dtos/inventoryAmount.dto';

export function GetGeneralStatisticsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene estadísticas generales (ganancias, total ventas, etc)',
    }),
    ApiOkResponse({ type: GeneralStatisticsDto }),
  );
}

export function GetProductSummaryDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un resumen de productos vendidos' }),
    ApiOkResponse({ type: BalanceProductSummaryDto }),
  );
}

export function GetInvoiceSummaryDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un resumen de todas las facturas' }),
    ApiOkResponse({ type: AllInvoiceSummariesDto }),
  );
}

export function GetTotalStockDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene el conteo total de stock de productos' }),
    ApiOkResponse({ type: ProductStockCountDto }),
  );
}

export function GetInvoiceChartListDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene una lista de datos de facturas para gráficos',
    }),
    ApiOkResponse({ type: InvoiceChartListDto }),
  );
}

export function GetInventoryAmountDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene una lista paginada de productos con bajo inventario',
    }),
    ApiOkResponse({
      type: ResponsePaginationDto<LowAmountProductDto>,
    }),
  );
}
