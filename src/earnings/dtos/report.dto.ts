export class PaymentTypeReportDto {
  paymentType: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  yearlyCount: number;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

export class ReportTotalsDto {
  dailyInvoices: number;
  weeklyInvoices: number;
  monthlyInvoices: number;
  yearlyInvoices: number;
  dailyAmount: number;
  weeklyAmount: number;
  monthlyAmount: number;
  yearlyAmount: number;
}

export class ReportSummaryDto {
  reportDate: string;
  timezone: string;
  paymentTypes: PaymentTypeReportDto[];
  totals: ReportTotalsDto;
}

export class MostUsedPaymentTypeDto {
  paymentType: string;
  count: number;
  total: number;
  percentage: number;
}

export class CategoryReportDto {
  category: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  yearlyCount: number;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

// Agregar estas clases a tu archivo report.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ProductDetailReportDto {
  @ApiProperty({
    description: 'ID del producto/servicio',
    example: 123,
    required: false,
  })
  productId?: number;

  @ApiProperty({
    description: 'Nombre del producto/servicio',
    example: 'Cerveza Corona',
  })
  productName: string;

  @ApiProperty({
    description: 'Tipo de categoría',
    example: 'BAR',
  })
  categoryType: string;

  @ApiProperty({
    description: 'Cantidad vendida hoy',
    example: 0,
  })
  dailyQuantity: number;

  @ApiProperty({
    description: 'Cantidad vendida esta semana',
    example: 3,
  })
  weeklyQuantity: number;

  @ApiProperty({
    description: 'Cantidad vendida este mes',
    example: 3,
  })
  monthlyQuantity: number;

  @ApiProperty({
    description: 'Cantidad vendida este año',
    example: 15,
  })
  yearlyQuantity: number;

  @ApiProperty({
    description: 'Total de ventas hoy',
    example: 0,
  })
  dailyTotal: number;

  @ApiProperty({
    description: 'Total de ventas esta semana',
    example: 2700,
  })
  weeklyTotal: number;

  @ApiProperty({
    description: 'Total de ventas este mes',
    example: 2700,
  })
  monthlyTotal: number;

  @ApiProperty({
    description: 'Total de ventas este año',
    example: 15000,
  })
  yearlyTotal: number;

  @ApiProperty({
    description: 'Precio unitario promedio',
    example: 900,
  })
  unitPrice: number;
}

export class DetailedCategoryReportDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'BAR',
  })
  category: string;

  @ApiProperty({
    description: 'Total de items vendidos hoy',
    example: 0,
  })
  dailyCount: number;

  @ApiProperty({
    description: 'Total de items vendidos esta semana',
    example: 5,
  })
  weeklyCount: number;

  @ApiProperty({
    description: 'Total de items vendidos este mes',
    example: 5,
  })
  monthlyCount: number;

  @ApiProperty({
    description: 'Total de items vendidos este año',
    example: 25,
  })
  yearlyCount: number;

  @ApiProperty({
    description: 'Total de dinero vendido hoy',
    example: 0,
  })
  dailyTotal: number;

  @ApiProperty({
    description: 'Total de dinero vendido esta semana',
    example: 4320,
  })
  weeklyTotal: number;

  @ApiProperty({
    description: 'Total de dinero vendido este mes',
    example: 4320,
  })
  monthlyTotal: number;

  @ApiProperty({
    description: 'Total de dinero vendido este año',
    example: 45000,
  })
  yearlyTotal: number;

  @ApiProperty({
    description: 'Detalle de productos en esta categoría',
    type: [ProductDetailReportDto],
  })
  products: ProductDetailReportDto[];
}
