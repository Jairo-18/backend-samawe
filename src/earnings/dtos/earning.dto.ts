import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsIn,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BalanceProductSummaryDto {
  @ApiProperty({
    example: 120000,
    description:
      'Suma total del valor de compra de todos los productos (unidades * precio de compra)',
    type: Number,
  })
  @IsNumber()
  totalProductPriceSale: number;

  @ApiProperty({
    example: 150000,
    description:
      'Suma total del valor de venta de todos los productos (unidades * precio de venta)',
    type: Number,
  })
  @IsNumber()
  totalProductPriceBuy: number;

  @ApiProperty({
    example: 30000,
    description:
      'Diferencia entre el total de ventas y compras (ganancias brutas)',
    type: Number,
  })
  @IsNumber()
  balanceProduct: number;
}

export class BalanceInvoiceSummaryDto {
  @ApiProperty({
    example: 'daily',
    description: 'Tipo de balance (daily, weekly, monthly, yearly)',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  type: string;

  @ApiProperty({
    example: '2023-05-15',
    description: 'Fecha del periodo en formato ISO 8601',
  })
  @IsDateString()
  periodDate: string;

  @ApiProperty({
    example: 120000,
    description: 'Suma total de facturas de venta en el periodo',
    type: Number,
  })
  @IsNumber()
  totalInvoiceSale: number;

  @ApiProperty({
    example: 150000,
    description: 'Suma total de facturas de compra en el periodo',
    type: Number,
  })
  @IsNumber()
  totalInvoiceBuy: number;

  @ApiProperty({
    example: 30000,
    description: 'Balance neto (ventas - compras) en el periodo',
    type: Number,
  })
  @IsNumber()
  balanceInvoice: number;
}

export class ProductStockCountDto {
  @ApiProperty({
    example: 450,
    description: 'Cantidad total de unidades en inventario',
    type: Number,
  })
  @IsNumber()
  totalStock: number;
}

export class AllInvoiceSummariesDto {
  @ApiProperty({
    description: 'Resumen diario de facturas',
    type: BalanceInvoiceSummaryDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => BalanceInvoiceSummaryDto)
  @IsOptional()
  daily?: BalanceInvoiceSummaryDto | null;

  @ApiProperty({
    description: 'Resumen semanal de facturas',
    type: BalanceInvoiceSummaryDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => BalanceInvoiceSummaryDto)
  @IsOptional()
  weekly?: BalanceInvoiceSummaryDto | null;

  @ApiProperty({
    description: 'Resumen mensual de facturas',
    type: BalanceInvoiceSummaryDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => BalanceInvoiceSummaryDto)
  @IsOptional()
  monthly?: BalanceInvoiceSummaryDto | null;

  @ApiProperty({
    description: 'Resumen anual de facturas',
    type: BalanceInvoiceSummaryDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => BalanceInvoiceSummaryDto)
  @IsOptional()
  yearly?: BalanceInvoiceSummaryDto | null;
}

export class InvoiceChartItemDto {
  @ApiProperty({
    example: 'FV-2023-001',
    description: 'Código único de la factura',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'FV',
    description: 'Tipo de factura (FV: Factura Venta, FC: Factura Compra)',
    enum: ['FV', 'FC', 'other'],
  })
  @IsString()
  @IsIn(['FV', 'FC', 'other'])
  type: 'FV' | 'FC' | 'other';

  @ApiProperty({
    example: 150000,
    description: 'Valor total de la factura',
    type: Number,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    example: '2023-05-15T10:00:00Z',
    description: 'Fecha de creación de la factura en formato ISO 8601',
  })
  @IsDateString()
  createdAt: Date;
}

export class InvoiceChartListDto {
  @ApiProperty({
    description: 'Facturas agrupadas por día',
    type: [InvoiceChartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceChartItemDto)
  daily: InvoiceChartItemDto[];

  @ApiProperty({
    description: 'Facturas agrupadas por semana',
    type: [InvoiceChartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceChartItemDto)
  weekly: InvoiceChartItemDto[];

  @ApiProperty({
    description: 'Facturas agrupadas por mes',
    type: [InvoiceChartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceChartItemDto)
  monthly: InvoiceChartItemDto[];

  @ApiProperty({
    description: 'Facturas agrupadas por año',
    type: [InvoiceChartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceChartItemDto)
  yearly: InvoiceChartItemDto[];
}
