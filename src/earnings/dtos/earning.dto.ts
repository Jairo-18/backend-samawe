import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString } from 'class-validator';
export class InvoicePeriodTotalsDto {
  @ApiProperty({ example: 11900, description: 'Total acumulado en el día' })
  @IsNumber()
  daily: number;

  @ApiProperty({ example: 235050, description: 'Total acumulado en la semana' })
  @IsNumber()
  weekly: number;

  @ApiProperty({ example: 235050, description: 'Total acumulado en el mes' })
  @IsNumber()
  monthly: number;

  @ApiProperty({ example: 235050, description: 'Total acumulado en el año' })
  @IsNumber()
  yearly: number;

  @ApiProperty({
    example: 1000000,
    description: 'Total acumulado histórico sin filtro de fecha',
  })
  @IsNumber()
  totalAllTime: number; // <--- agregado total global histórico
}

export class InvoiceTotalsDto {
  @ApiProperty({
    type: InvoicePeriodTotalsDto,
    description:
      'Totales de ventas por periodo (día, semana, mes, año) y total global',
  })
  @IsObject()
  invoiceSale: InvoicePeriodTotalsDto;

  @ApiProperty({
    type: InvoicePeriodTotalsDto,
    description:
      'Totales de compras por periodo (día, semana, mes, año) y total global',
  })
  @IsObject()
  invoiceBuy: InvoicePeriodTotalsDto;
}

export class SoldStatsPeriodDto {
  @ApiProperty({
    example: 1,
    description: 'Cantidad de unidades vendidas en el periodo',
  })
  @IsNumber()
  count: number;

  @ApiProperty({
    example: 11900,
    description: 'Total de ventas en moneda en el periodo',
  })
  @IsNumber()
  total: number;
}

export class SoldStatsItemTypeDto {
  @ApiProperty({
    type: SoldStatsPeriodDto,
    description: 'Estadísticas de ventas del día actual',
  })
  @IsObject()
  daily: SoldStatsPeriodDto;

  @ApiProperty({
    type: SoldStatsPeriodDto,
    description: 'Estadísticas de ventas de la semana actual',
  })
  @IsObject()
  weekly: SoldStatsPeriodDto;

  @ApiProperty({
    type: SoldStatsPeriodDto,
    description: 'Estadísticas de ventas del mes actual',
  })
  @IsObject()
  monthly: SoldStatsPeriodDto;

  @ApiProperty({
    type: SoldStatsPeriodDto,
    description: 'Estadísticas de ventas del año actual',
  })
  @IsObject()
  yearly: SoldStatsPeriodDto;
}

export class CountAndTotalItemsDto {
  @ApiProperty({
    type: SoldStatsItemTypeDto,
    description:
      'Estadísticas de productos vendidos (comidas, bebidas, artículos físicos)',
  })
  @IsObject()
  products: SoldStatsItemTypeDto;

  @ApiProperty({
    type: SoldStatsItemTypeDto,
    description:
      'Estadísticas de alojamientos vendidos (hoteles, habitaciones, hospedajes)',
  })
  @IsObject()
  accommodations: SoldStatsItemTypeDto;

  @ApiProperty({
    type: SoldStatsItemTypeDto,
    description:
      'Estadísticas de excursiones vendidas (tours, actividades turísticas)',
  })
  @IsObject()
  excursions: SoldStatsItemTypeDto;
}

export class InventoryProductDto {
  @ApiProperty({
    example: 'Bandeja Paisa',
    description: 'Nombre del producto en inventario',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 15,
    description: 'Cantidad disponible en stock',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 50000,
    description: 'Precio de venta unitario del producto',
  })
  @IsNumber()
  priceSale: number;

  @ApiProperty({
    example: 750000,
    description: 'Valor total del producto en inventario (cantidad × precio)',
  })
  @IsNumber()
  totalValue: number;
}

export class InventoryTotalDto {
  @ApiProperty({
    example: 13600000,
    description: 'Valor total de todo el inventario sumado',
  })
  @IsNumber()
  totalInventoryValue: number;
}

export class InvoiceSummaryDto {
  @ApiProperty({
    type: InvoiceTotalsDto,
    description: 'Resumen de totales de facturas de venta y compra',
  })
  @IsObject()
  invoiceTotals: InvoiceTotalsDto;

  @ApiProperty({
    type: CountAndTotalItemsDto,
    description:
      'Estadísticas detalladas de productos, alojamientos y excursiones vendidas',
  })
  @IsObject()
  soldStats: CountAndTotalItemsDto;

  @ApiProperty({
    type: InventoryTotalDto,
    description: 'Estado actual del inventario con productos y valores',
  })
  @IsObject()
  inventory: InventoryTotalDto;
}

export class TotalWithProducts {
  @ApiProperty({
    example: 123456,
    description: 'Total acumulado de ventas más inventario (valor numérico)',
  })
  @IsNumber()
  total: number;
}
