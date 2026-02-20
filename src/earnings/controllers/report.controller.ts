import { Response } from 'express';
import { Controller, Get, Res, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { ReportService } from './../services/report.service';
import { CategoryReportDto, PaymentTypeReportDto } from './../dtos/report.dto';
import { CategoryDetailReport } from '../interfaces/report.interface';

import * as ExcelJS from 'exceljs';

@Controller('reports')
@ApiTags('Reportes de Facturas')
export class ReportController {
  constructor(private readonly _reportService: ReportService) {}

  private styleHeader(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '3d9f3d' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  private styleTable(worksheet: ExcelJS.Worksheet) {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.font = { name: 'Calibri', size: 11 };
      });
    });

    worksheet.columns.forEach((col) => {
      let maxLength = 0;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 10;
        if (len > maxLength) maxLength = len;
      });
      col.width = maxLength + 2;
    });
  }

  private formatCurrencyCells(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const headerText = (cell.value || '').toString().toLowerCase();
      if (headerText.includes('total')) {
        worksheet.getColumn(colNumber).numFmt = '"$"#,##0.00';
      }
    });
  }

  @Get('payment-types')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({
    type: [PaymentTypeReportDto],
    description: 'Reporte de todos los tipos de pago',
  })
  async getAllPaymentTypesReport(): Promise<PaymentTypeReportDto[]> {
    return this._reportService.generateAllPaymentTypesReport();
  }

  @Get('sales-by-category')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({
    type: [CategoryReportDto],
    description:
      'Reporte de ventas por categoría (productos, hospedajes, pasadías)',
  })
  async getSalesByCategoryReport(): Promise<CategoryReportDto[]> {
    return this._reportService.generateSalesByCategoryReport();
  }

  @Get('sales-by-category/with-details')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({
    description: 'Reporte de ventas por categoría con detalles de cada ítem',
  })
  async getSalesByCategoryWithDetails(): Promise<CategoryDetailReport[]> {
    return this._reportService.generateSalesByCategoryWithDetails();
  }

  @Get('sales-by-category/:category/details/:period')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiParam({
    name: 'category',
    description: 'Nombre de la categoría (BAR, RESTAURANTE, etc.)',
  })
  @ApiParam({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Período del reporte',
  })
  @ApiOkResponse({
    description:
      'Detalles específicos de una categoría en un período determinado',
  })
  async getCategoryDetailsForPeriod(
    @Param('category') category: string,
    @Param('period') period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) {
    return this._reportService.getCategoryDetailsForPeriod(category, period);
  }

  @Get('payment-types/excel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async exportPaymentTypesExcel(@Res() res: Response) {
    const reports = await this._reportService.generateAllPaymentTypesReport();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Reporte de Pagos');

    const header = [
      'Tipo de Pago',
      'Ventas Diarias',
      'Ventas Semanales',
      'Ventas Mensuales',
      'Ventas Anuales',
      'Total Diario',
      'Total Semanal',
      'Total Mensual',
      'Total Anual',
    ];

    this.styleHeader(ws.addRow(header));

    reports.forEach((r) => {
      ws.addRow([
        r.paymentType,
        r.dailyCount,
        r.weeklyCount,
        r.monthlyCount,
        r.yearlyCount,
        r.dailyTotal,
        r.weeklyTotal,
        r.monthlyTotal,
        r.yearlyTotal,
      ]);
    });

    this.formatCurrencyCells(ws);
    this.styleTable(ws);

    const now = new Date();
    const fecha =
      now.toLocaleDateString('es-CO').replace(/\//g, '-') +
      '_' +
      now.toLocaleTimeString('es-CO', { hour12: false }).replace(/:/g, '-');

    const fileName = `Reporte_de_Pagos_${fecha}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('sales-by-category/excel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async exportSalesByCategoryExcel(@Res() res: Response) {
    const reports = await this._reportService.generateSalesByCategoryReport();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ventas por Categoría');

    worksheet.addRow([
      'Categoría',
      'Ventas Diarias',
      'Ventas Semanales',
      'Ventas Mensuales',
      'Ventas Anuales',
      'Total Diario',
      'Total Semanal',
      'Total Mensual',
      'Total Anual',
    ]);

    reports.forEach((r) => {
      worksheet.addRow([
        r.category,
        r.dailyCount,
        r.weeklyCount,
        r.monthlyCount,
        r.yearlyCount,
        r.dailyTotal,
        r.weeklyTotal,
        r.monthlyTotal,
        r.yearlyTotal,
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales-by-category-report.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('sales-by-category/with-details/excel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async exportSalesByCategoryWithDetailsExcel(@Res() res: Response) {
    const reports =
      await this._reportService.generateSalesByCategoryWithDetails();
    const workbook = new ExcelJS.Workbook();

    const summary = workbook.addWorksheet('Resumen por Categoría');
    const header = [
      'Categoría',
      'Ventas Diarias',
      'Ventas Semanales',
      'Ventas Mensuales',
      'Ventas Anuales',
      'Total Diario',
      'Total Semanal',
      'Total Mensual',
      'Total Anual',
    ];

    this.styleHeader(summary.addRow(header));

    reports.forEach((r) => {
      summary.addRow([
        r.category,
        r.summary.dailyCount,
        r.summary.weeklyCount,
        r.summary.monthlyCount,
        r.summary.yearlyCount,
        r.summary.dailyTotal,
        r.summary.weeklyTotal,
        r.summary.monthlyTotal,
        r.summary.yearlyTotal,
      ]);
    });

    this.formatCurrencyCells(summary);
    this.styleTable(summary);

    summary.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = maxLength + 5;
    });

    for (const r of reports) {
      const ws = workbook.addWorksheet(`Detalles ${r.category}`);
      const headerDetail = [
        'Período',
        'Fecha Factura',
        'Tipo de Ítem',
        'Nombre del Ítem',
        'Cantidad',
        'Subtotal',
      ];
      this.styleHeader(ws.addRow(headerDetail));

      const allDetails = [
        ...r.details.daily.map((d) => ({ ...d, period: 'DIARIO' })),
        ...r.details.weekly.map((d) => ({ ...d, period: 'SEMANAL' })),
        ...r.details.monthly.map((d) => ({ ...d, period: 'MENSUAL' })),
        ...r.details.yearly.map((d) => ({ ...d, period: 'ANUAL' })),
      ].sort(
        (a, b) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
      );

      if (allDetails.length > 0) {
        allDetails.forEach((d) => {
          ws.addRow([
            d.period,
            d.invoiceDate,
            d.itemType,
            d.itemName,
            d.amount,
            d.subtotal,
          ]);
        });
      } else {
        ws.addRow(['N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Sin datos disponibles']);
      }

      this.formatCurrencyCells(ws);
      this.styleTable(ws);

      ws.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 10;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        column.width = maxLength + 5;
      });
    }

    const now = new Date();
    const fecha =
      now.toLocaleDateString('es-CO').replace(/\//g, '-') +
      '_' +
      now.toLocaleTimeString('es-CO', { hour12: false }).replace(/:/g, '-');

    const fileName = `Reporte_Detallado_de_Items_${fecha}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }
}
