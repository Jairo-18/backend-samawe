import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PaginatedListExcursionsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'EXC-001',
    description: 'Código de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Tour Isla del Sol',
    description: 'Nombre de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Excursión de día completo a la Isla del Sol',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 150.5,
    description: 'Precio de compra',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceBuy?: number;

  @ApiProperty({
    example: 250.75,
    description: 'Precio de venta',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceSale?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de estado',
    required: false,
  })
  @IsOptional()
  @IsString()
  stateType?: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryType?: number;
}

export class PaginatedExcursionSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Paseo río',
    description: 'Texto de búsqueda por nombre de la pasadía',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PartialExcursionDto {
  @ApiProperty({
    example: 'Paseo rio',
    description: 'Nombre de la excursion',
  })
  name: string;
}
