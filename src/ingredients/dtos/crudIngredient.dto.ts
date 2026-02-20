import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class PaginatedListIngredientsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Arroz',
    description: 'Nombre del ingrediente',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'kg',
    description: 'Unidad de medida',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    example: true,
    description: 'Filtrar por ingredientes activos',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: true,
    description: 'Mostrar solo ingredientes con stock bajo (menor a minStock)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;
}

export class PaginatedIngredientSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Arr',
    description: 'Texto de búsqueda por nombre del ingrediente',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: true,
    description: 'Filtrar solo ingredientes activos',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
