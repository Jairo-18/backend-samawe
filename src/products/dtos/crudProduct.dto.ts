import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class PaginatedListProductsParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 1,
    description: 'Tipo de categoría',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryType?: number;

  @ApiProperty({
    example: 'CC-12',
    description: 'Código de producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'La coca cola es rica',
    description: 'Descripción del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 23,
    description: 'Unidades del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  amount?: number;

  @ApiProperty({
    example: 12000,
    description: 'Precio de compra',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceBuy?: number;

  @ApiProperty({
    example: 23000,
    description: 'Precio de venta',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceSale?: number;

  @ApiProperty({
    example: false,
    description: 'Boolean',
    required: false,
  })
  @IsOptional()
  @IsString()
  isActive?: boolean;
}

export class PaginatedProductSelectParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 'Coca',
    description: 'Texto de búsqueda por nombre del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PartialProductDto {
  @ApiProperty({
    example: 'Coca Cola',
    description: 'Nombre del producto',
  })
  name: string;
}
