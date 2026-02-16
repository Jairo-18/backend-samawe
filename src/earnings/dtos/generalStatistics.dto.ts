import { ApiProperty } from '@nestjs/swagger';

export class CountByGroupDto {
  @ApiProperty({
    example: 'Disponible',
    description: 'Nombre del estado o condición',
  })
  state: string;

  @ApiProperty({
    example: 12,
    description: 'Cantidad de registros que coinciden con el estado',
    type: Number,
  })
  count: number;
}

export class ReservedAccommodationDto {
  @ApiProperty({
    example: 2,
    description: 'ID del alojamiento reservado',
  })
  accommodationId: number;

  @ApiProperty({
    example: 2,
    description: 'ID de la factura asociada',
  })
  invoiceId: number;
}

export class DailySalesDto {
  @ApiProperty({
    example: 5,
    description: 'Total de productos vendidos',
  })
  totalProductsSold: number;

  @ApiProperty({
    example: 22610.0,
    description: 'Total de alojamientos vendidos en valor monetario',
  })
  totalAccommodationsSold: number;

  @ApiProperty({
    example: 1500.0,
    description: 'Total de excursiones vendidas en valor monetario',
  })
  totalExcursionsSold: number;

  @ApiProperty({
    example: 24110.0,
    description: 'Suma total de todas las ventas',
  })
  totalSales: number;

  @ApiProperty({
    example: 3,
    description: 'Cantidad de transacciones de productos',
  })
  countProducts: number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad de transacciones de alojamientos',
  })
  countAccommodations: number;

  @ApiProperty({
    example: 1,
    description: 'Cantidad de transacciones de excursiones',
  })
  countExcursions: number;
}

export class GeneralStatisticsDto {
  @ApiProperty({
    type: [CountByGroupDto],
    description: 'Cantidad de productos activos e inactivos',
  })
  products: CountByGroupDto[];

  @ApiProperty({
    type: [CountByGroupDto],
    description: 'Cantidad de habitaciones agrupadas por estado',
  })
  accommodations: CountByGroupDto[];

  @ApiProperty({
    type: [CountByGroupDto],
    description: 'Cantidad de excursiones agrupadas por estado',
  })
  excursions: CountByGroupDto[];

  @ApiProperty({
    type: [ReservedAccommodationDto],
    description: 'Lista de alojamientos actualmente reservados',
  })
  reservedAccommodations: ReservedAccommodationDto[];

  @ApiProperty({
    type: DailySalesDto,
    description: 'Resumen de ventas del día',
  })
  dailySales: DailySalesDto;
}
