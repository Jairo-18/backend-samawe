import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InvoiceExcelService {
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
      col.width = maxLength + 4;
    });
  }

  private formatCurrencyColumns(
    worksheet: ExcelJS.Worksheet,
    colNumbers: number[],
  ) {
    colNumbers.forEach((colNum) => {
      worksheet.getColumn(colNum).numFmt = '"$"#,##0.00';
    });
  }

  private applyCellStyle(
    cell: ExcelJS.Cell,
    options: {
      bgColor?: string;
      bold?: boolean;
      color?: string;
      numFmt?: string;
      align?: ExcelJS.Alignment['horizontal'];
    },
  ) {
    if (options.bgColor) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: options.bgColor },
      };
    }
    cell.font = {
      bold: options.bold ?? false,
      color: { argb: options.color ?? 'FF000000' },
      name: 'Calibri',
      size: 10,
    };
    if (options.numFmt) cell.numFmt = options.numFmt;
    cell.alignment = {
      vertical: 'middle',
      horizontal: options.align ?? 'left',
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  private getDetailBreakdown(detail: any): {
    amount: number;
    pwt: number;
    pwot: number;
    pctDisplay: number;
    taxName: string;
    subtotalSinImp: number;
    impuesto: number;
    totalItem: number;
  } {
    const amount = Number(detail.amount ?? 0);
    const pwt = Number(detail.priceWithTax ?? 0);
    let pwot = Number(detail.priceWithoutTax ?? 0);

    const rawPct = Number(detail.taxeType?.percentage ?? 0);
    const taxRate = rawPct > 1 ? rawPct / 100 : rawPct;
    const pctDisplay = rawPct > 1 ? rawPct : Math.round(rawPct * 100);
    const taxName = detail.taxeType?.name ?? 'Sin impuesto';

    if (taxRate > 0 && Math.abs(pwt - pwot) < 0.01) {
      pwot = Math.round((pwt / (1 + taxRate)) * 100) / 100;
    }

    const subtotalSinImp = Math.round(amount * pwot * 100) / 100;
    const impuesto = Math.round(amount * (pwt - pwot) * 100) / 100;
    const totalItem = Number(detail.subtotal ?? amount * pwt);

    return {
      amount,
      pwt,
      pwot,
      pctDisplay,
      taxName,
      subtotalSinImp,
      impuesto,
      totalItem,
    };
  }

  private sortInvoices(invoices: any[]): any[] {
    const typeOrder = (inv: any): number => {
      const name = (inv.invoiceType?.name ?? '').toUpperCase();
      if (name.includes('VENTA')) return 1;
      if (name.includes('COMPRA')) return 2;
      return 3;
    };
    return [...invoices].sort((a, b) => {
      const groupDiff = typeOrder(a) - typeOrder(b);
      if (groupDiff !== 0) return groupDiff;
      return parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10);
    });
  }

  buildWorkbook(invoices: any[]): ExcelJS.Workbook {
    const sorted = this.sortInvoices(invoices);
    const workbook = new ExcelJS.Workbook();
    const COP = '"$"#,##0.00';

    const ws1 = workbook.addWorksheet('Resumen');
    this.styleHeader(
      ws1.addRow([
        'Código',
        'Fecha',
        'Tipo Factura',
        'Nombres y Apellidos',
        'No. Identificación',
        'Tipo Identificación',
        'Tipo Persona',
        'Tipo Pago',
        'Estado Pago',
        'Subtotal (sin imp.)',
        'IVA 19%',
        'IPO 8%',
        'IPO 5%',
        'Total Impuesto',
        'Total',
      ]),
    );

    for (const inv of sorted) {
      const clientName = inv.user
        ? `${inv.user.firstName ?? ''} ${inv.user.lastName ?? ''}`.trim()
        : 'N/A';
      let totalVat = 0,
        totalIco8 = 0,
        totalIco5 = 0,
        subtotalSinImpTotal = 0;
      for (const d of inv.invoiceDetails ?? []) {
        const b = this.getDetailBreakdown(d);
        subtotalSinImpTotal += b.subtotalSinImp;
        const tid = d.taxeType?.taxeTypeId ?? null;
        if (tid === 1) totalVat += b.impuesto;
        else if (tid === 3) totalIco8 += b.impuesto;
        else if (tid === 4) totalIco5 += b.impuesto;
      }
      ws1.addRow([
        inv.code ?? '',
        inv.startDate
          ? new Date(inv.startDate).toLocaleDateString('es-CO')
          : '',
        inv.invoiceType?.name ?? '',
        clientName,
        inv.user?.identificationNumber ?? '',
        inv.user?.identificationType?.name ?? '',
        inv.user?.personType?.name ?? '',
        inv.payType?.name ?? '',
        inv.paidType?.name ?? '',
        Math.round(subtotalSinImpTotal * 100) / 100,
        Math.round(totalVat * 100) / 100,
        Math.round(totalIco8 * 100) / 100,
        Math.round(totalIco5 * 100) / 100,
        Math.round((totalVat + totalIco8 + totalIco5) * 100) / 100,
        Number(inv.total ?? 0),
      ]);
    }
    this.formatCurrencyColumns(ws1, [10, 11, 12, 13, 14, 15]);
    this.styleTable(ws1);

    const ws2 = workbook.addWorksheet('Detalle por Factura');
    const GREEN_HEADER = 'FF3d9f3d';
    const BLUE_COL_HDR = 'FF1565C0';
    const TOTAL_BG = 'FFE8F5E9';

    const ITEM_COLS = [
      'Código',
      'Nombre',
      'Tipo',
      'Cantidad',
      'P. Unitario',
      'Tipo Impuesto',
      '% Imp.',
      'Subtotal sin imp.',
      'Impuesto',
      'Total Ítem',
    ];

    for (const inv of sorted) {
      const clientName = inv.user
        ? `${inv.user.firstName ?? ''} ${inv.user.lastName ?? ''}`.trim()
        : 'N/A';
      const fecha = inv.startDate
        ? new Date(inv.startDate).toLocaleDateString('es-CO')
        : '';

      const invHeaderRow = ws2.addRow([
        `FACTURA: ${inv.code ?? ''}`,
        `Fecha: ${fecha}`,
        `Tipo: ${inv.invoiceType?.name ?? ''}`,
        `Cliente: ${clientName}`,
        `${inv.user?.identificationType?.name ?? ''}: ${inv.user?.identificationNumber ?? ''}`,
        `Tipo persona: ${inv.user?.personType?.name ?? ''}`,
        `Pago: ${inv.payType?.name ?? ''}`,
        `Estado: ${inv.paidType?.name ?? ''}`,
        '',
        '',
        '',
      ]);
      invHeaderRow.eachCell((cell) => {
        this.applyCellStyle(cell, {
          bgColor: GREEN_HEADER,
          bold: true,
          color: 'FFFFFFFF',
          align: 'left',
        });
      });
      invHeaderRow.height = 18;

      const colHdrRow = ws2.addRow(ITEM_COLS);
      colHdrRow.eachCell((cell) => {
        this.applyCellStyle(cell, {
          bgColor: BLUE_COL_HDR,
          bold: true,
          color: 'FFFFFFFF',
          align: 'center',
        });
      });

      const details = inv.invoiceDetails ?? [];

      if (details.length === 0) {
        const emptyRow = ws2.addRow(['Sin ítems registrados']);
        emptyRow.getCell(1).font = {
          italic: true,
          color: { argb: 'FF888888' },
          size: 10,
        };
      } else {
        let invSubtotalSinImp = 0,
          invImpuesto = 0,
          invTotal = 0;

        for (const detail of details) {
          let itemCode = '',
            itemName = '',
            itemType = '';
          if (detail.product) {
            itemCode = detail.product.code ?? '';
            itemName = (detail.product.name as any)?.['es'] ?? detail.product.name?.toString() ?? '';
            itemType = (detail.product.categoryType?.name as any)?.['es'] ?? detail.product.categoryType?.name?.toString() ?? 'Producto';
          } else if (detail.accommodation) {
            itemCode = detail.accommodation.code ?? '';
            itemName = (detail.accommodation.name as any)?.['es'] ?? detail.accommodation.name?.toString() ?? '';
            itemType = (detail.accommodation.categoryType?.name as any)?.['es'] ?? detail.accommodation.categoryType?.name?.toString() ?? 'Hospedaje';
          } else if (detail.excursion) {
            itemCode = detail.excursion.code ?? '';
            itemName = (detail.excursion.name as any)?.['es'] ?? detail.excursion.name?.toString() ?? '';
            itemType = (detail.excursion.categoryType?.name as any)?.['es'] ?? detail.excursion.categoryType?.name?.toString() ?? 'Pasadía/Servicio';
          }

          const b = this.getDetailBreakdown(detail);
          invSubtotalSinImp += b.subtotalSinImp;
          invImpuesto += b.impuesto;
          invTotal += b.totalItem;

          const itemRow = ws2.addRow([
            itemCode,
            itemName,
            itemType,
            b.amount,
            b.pwt,
            b.taxName,
            b.pctDisplay,
            b.subtotalSinImp,
            b.impuesto,
            b.totalItem,
          ]);
          [5, 8, 9, 10].forEach((c) => {
            itemRow.getCell(c).numFmt = COP;
          });
          itemRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.font = { name: 'Calibri', size: 10 };
          });
        }

        const totalsRow = ws2.addRow([
          'TOTALES',
          '',
          '',
          '',
          '',
          '',
          '',
          Math.round(invSubtotalSinImp * 100) / 100,
          Math.round(invImpuesto * 100) / 100,
          Math.round(invTotal * 100) / 100,
        ]);
        totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          this.applyCellStyle(cell, {
            bgColor: TOTAL_BG,
            bold: colIdx >= 8,
            numFmt: colIdx >= 8 ? COP : undefined,
            align: colIdx === 1 ? 'left' : 'right',
          });
        });
      }

      ws2.addRow([]);
    }

    ws2.columns.forEach((col) => {
      let max = 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 3, 45);
    });

    return workbook;
  }

  async buildBuffer(invoices: any[]): Promise<ArrayBuffer> {
    const workbook = this.buildWorkbook(invoices);
    return workbook.xlsx.writeBuffer();
  }
}
