import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Parámetros de `GET invoices/mine`. `perPage` tiene tope de 10: es el
 * historial de UN cliente, no un listado de gestión, y el tope evita que se
 * pida todo de golpe.
 */
export class MyInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ['stays', 'orders'] })
  @IsOptional()
  @IsIn(['stays', 'orders'])
  kind?: 'stays' | 'orders';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 5, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  perPage?: number = 5;
}
