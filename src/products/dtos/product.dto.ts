import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsPositive,
  IsInt,
  IsNumber,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'ID del producto', required: true })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: number;

  @ApiProperty({
    example: 'Coca Cola 1L',
    description: 'Nombre del producto',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es requerido' })
  name: string;

  @ApiProperty({
    example: 'Bebida gaseosa de 1 litro',
    description: 'Descripción del producto',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 10,
    description: 'Cantidad disponible',
    required: true,
  })
  @IsInt()
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  amount: number;

  @ApiProperty({
    example: 2000.0,
    description: 'Precio del producto',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de categoría (relación con CategoryType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryTypeId: number;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de disponibilidad (relación con AvailableType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El tipo de disponibilidad es requerido' })
  availableTypeId: number;
}
