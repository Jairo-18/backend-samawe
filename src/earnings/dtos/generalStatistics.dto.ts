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
  })
  count: number;
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
}
