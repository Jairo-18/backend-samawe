import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';
import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';

/**
 * DTO para crear un menú
 */
export class CreateMenuDto {
  @ApiProperty({
    example: 'Menú Gourmet',
    description: 'Nombre del menú',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del menú es requerido' })
  name: string;

  @ApiPropertyOptional({
    example: 'Selección de platillos premium',
    description: 'Descripción del menú',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: [1, 2, 3],
    description:
      'IDs de los productos (platos) cuyas recetas se incluirán en el menú',
    required: true,
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos un platillo al menú' })
  @IsNumber({}, { each: true })
  productIds: number[];

  @ApiPropertyOptional({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización asociada',
  })
  @IsString()
  @IsOptional()
  organizationalId?: string;
}

/**
 * DTO para actualizar un menú
 */
export class UpdateMenuDto {
  @ApiPropertyOptional({
    example: 'Menú VIP',
    description: 'Nombre del menú',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Platillos exclusivos para clientes VIP',
    description: 'Descripción del menú',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: [1, 3, 5],
    description:
      'IDs de los productos (platos) cuyas recetas se incluirán (reemplazará las existentes)',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  productIds?: number[];

  @ApiPropertyOptional({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización asociada',
  })
  @IsString()
  @IsOptional()
  organizationalId?: string;
}

/**
 * DTO para paginar y filtrar menús
 */
export class PaginatedMenuParamsDto extends ParamsPaginationDto {}
