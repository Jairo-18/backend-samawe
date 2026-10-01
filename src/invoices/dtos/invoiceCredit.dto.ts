import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class SetInvoiceCreditDto {
  @ApiProperty({ example: 60, description: 'Plazo total: 30, 60 o 90 días' })
  @IsInt()
  @IsIn([30, 60, 90], { message: 'El plazo debe ser 30, 60 o 90 días' })
  creditDays: number;
}

export class CreateInvoicePaymentDto {
  @ApiProperty({ example: 50000, description: 'Monto del abono' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El abono debe ser mayor a 0' })
  amount: number;

  @ApiPropertyOptional({ description: 'ID del PayType con el que se abonó' })
  @IsOptional()
  @IsInt()
  payTypeId?: number;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Día en que se recibió el dinero. Por defecto hoy.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  paidAt?: string;

  @ApiPropertyOptional({ example: 'Primera cuota' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
