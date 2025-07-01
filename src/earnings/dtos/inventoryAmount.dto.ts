import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LowAmountProductDto {
  @ApiProperty({
    description: 'ID único del producto',
    example: 1,
  })
  @IsNumber()
  productId: number;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Coca Cola 2L',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 1,
  })
  @IsNumber()
  amount: number;
}

export class InventoryLowParamsDto extends ParamsPaginationDto {
  @ApiPropertyOptional({
    description: 'Nombre o parte del nombre del producto',
    example: 'Coca',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Cantidad exacta del producto (si se desea filtrar por cantidad exacta)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsString()
  amount?: number;
}
