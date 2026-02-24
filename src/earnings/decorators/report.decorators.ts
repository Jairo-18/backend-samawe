import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiOperation,
} from '@nestjs/swagger';
import { CategoryReportDto, PaymentTypeReportDto } from './../dtos/report.dto';

export function GetAllPaymentTypesReportDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene un reporte consolidado de todos los tipos de pago',
    }),
    ApiOkResponse({
      type: [PaymentTypeReportDto],
      description: 'Reporte de todos los tipos de pago',
    }),
  );
}

export function GetSalesByCategoryReportDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene un reporte general de ventas agrupadas por categoría',
    }),
    ApiOkResponse({
      type: [CategoryReportDto],
      description:
        'Reporte de ventas por categoría (productos, hospedajes, pasadías)',
    }),
  );
}

export function GetSalesByCategoryWithDetailsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Obtiene reporte de ventas por categoría con desglose completo de cada ítem',
    }),
    ApiOkResponse({
      description: 'Reporte de ventas por categoría con detalles de cada ítem',
    }),
  );
}

export function GetCategoryDetailsForPeriodDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Obtiene los detalles específicos de ventas para una categoría en un período dado',
    }),
    ApiParam({
      name: 'category',
      description: 'Nombre de la categoría (BAR, RESTAURANTE, etc.)',
    }),
    ApiParam({
      name: 'period',
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      description: 'Período del reporte',
    }),
    ApiOkResponse({
      description:
        'Detalles específicos de una categoría en un período determinado',
    }),
  );
}

export function ExportPaymentTypesExcelDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Exporta a Excel el reporte de tipos de pago' }),
  );
}

export function ExportSalesByCategoryExcelDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Exporta a Excel el reporte de ventas por categoría',
    }),
  );
}

export function ExportSalesByCategoryWithDetailsExcelDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Exporta a Excel el reporte detallado de ventas por categoría',
    }),
  );
}
