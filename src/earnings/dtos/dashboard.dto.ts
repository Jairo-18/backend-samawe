import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import {
  DASHBOARD_PERIODS,
  DashboardPeriod,
} from '../utils/period-range.utils';

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_PERIODS, default: 'monthly' })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS as unknown as string[])
  period?: DashboardPeriod;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Solo con period=custom: primer día (AAAA-MM-DD), inclusive.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Solo con period=custom: último día (AAAA-MM-DD), inclusive.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

/** Totales de un período. Todo NETO de notas DIAN (mismo neteo que el balance). */
export interface DashboardTotals {
  /** Ventas: FV + FVE, − notas crédito + notas débito. */
  sales: number;
  /** Compras: FC + DSE, − notas de ajuste. */
  purchases: number;
  /** Ventas − compras. */
  result: number;
  /** Facturas de venta con valor neto mayor que 0 (las anuladas no cuentan). */
  salesCount: number;
  purchasesCount: number;
}

/** Una casilla de la serie: una hora, un día o un mes según el período. */
export interface DashboardBucket {
  /** Instante en que empieza la casilla; el cliente lo rotula. */
  start: string;
  sales: number;
  purchases: number;
  /** La casilla equivalente del período anterior (`null` si no existe). */
  previousSales: number | null;
  previousPurchases: number | null;
  /** Aún no llega: el cliente no debe pintarla como si fuera un cero real. */
  future: boolean;
}

/** Una porción de un desglose (por categoría o por forma de pago). */
export interface DashboardBreakdownItem {
  /** Código estable (`HOSPEDAJE`, `EFE`, `DEBIT_NOTES`…). */
  key: string;
  name: string;
  total: number;
  count?: number;
}

/** Un producto, hospedaje o excursión de "los más vendidos". */
export interface DashboardTopItem {
  name: string;
  category: string;
  quantity: number;
  total: number;
}

export interface DashboardResponse {
  period: DashboardPeriod;
  range: { start: string; end: string };
  previousRange: { start: string; end: string };
  current: DashboardTotals;
  previous: DashboardTotals;
  series: DashboardBucket[];
  /** Ventas por categoría, de mayor a menor. Suma lo mismo que `current.sales`. */
  byCategory: DashboardBreakdownItem[];
  /** Ventas por forma de pago. Suma exactamente `current.sales`. */
  byPayType: DashboardBreakdownItem[];
  /** Los más vendidos por valor. */
  top: DashboardTopItem[];
  generatedAt: string;
}
