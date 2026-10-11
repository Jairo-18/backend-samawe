import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Parámetros del catálogo PÚBLICO (productos, servicios). Sin `organizationalId`:
 * el hotel sale del host del sitio, nunca del cliente.
 */
export class PublicCatalogParamsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Tope bajo a propósito: es un endpoint sin autenticación. */
  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number = 12;

  @ApiPropertyOptional({ description: 'Texto a buscar en el nombre (español).' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ description: 'Filtra por categoría.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryTypeId?: number;
}

/** Lo que el catálogo público muestra de un producto o servicio. */
export interface PublicCatalogItem {
  id: number;
  code: string | null;
  name: Record<string, string>;
  description: Record<string, string> | null;
  priceSale: number;
  /** Porcentaje del impuesto (p. ej. 19), o null si no tiene. */
  taxPercentage: number | null;
  categoryType: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  images: { imageUrl: string }[];
}
