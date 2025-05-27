import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ example: 1, description: 'ID de la factura', required: false })
  @IsNumber()
  @IsOptional()
  invoiceId: number;

  @ApiProperty({
    example: 1,
    description: 'Tipo de factura (relación con invoiceType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El tipo es requerido' })
  invoiceTypeId: number;

  @ApiProperty({ example: '0023', description: 'Código de factura' })
  @IsString()
  @IsNotEmpty({ message: 'El código de factura es requerido' })
  code: string;

  @ApiProperty({ example: '2025-05-27', description: 'Fecha de inicio' })
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato YYYY-MM-DD' },
  )
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: string;

  @ApiProperty({ example: '2025-05-30', description: 'Fecha de fin' })
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener formato YYYY-MM-DD' },
  )
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  endDate: string;
}
