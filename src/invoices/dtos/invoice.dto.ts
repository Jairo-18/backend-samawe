import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import { OnlyOneDefined } from '../../shared/validators/onlyOneDefined';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

import { GET_INVOICE_EXAMPLE } from '../constants/exampleInvoices.conts';
import { Type } from 'class-transformer';
import { CreateInvoiceDetailDto } from './invoiceDetaill.dto';

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

export class GetInvoiceWithDetails implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: GET_INVOICE_EXAMPLE,
  })
  data: Invoice;
}

@OnlyOneDefined(['productId', 'accommodationId', 'excursionId'], {
  message:
    'Debes especificar exactamente uno entre productId, accommodationId o excursionId',
})
export class CreateInvoiceWithDetailsDto extends CreateInvoiceDto {
  @ApiProperty({
    description: 'Lista de detalles que componen la factura',
    type: [CreateInvoiceDetailDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceDetailDto)
  details: CreateInvoiceDetailDto[];
}

class InvoiceDetailDto {
  @ApiPropertyOptional({
    description:
      'ID del detalle de factura (solo para editar detalles existentes)',
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  invoiceDetailId?: number;

  @ApiPropertyOptional({
    description: 'ID del producto asociado al detalle',
    example: 45,
  })
  @IsNumber()
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({
    description: 'ID del hospedaje asociado al detalle',
    example: 12,
  })
  @IsNumber()
  @IsOptional()
  accommodationId?: number;

  @ApiPropertyOptional({
    description: 'ID de la excursión asociada al detalle',
    example: 7,
  })
  @IsNumber()
  @IsOptional()
  excursionId?: number;

  @ApiProperty({
    description: 'Cantidad del ítem en el detalle',
    example: 3,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Precio sin impuesto',
    example: 150.75,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithoutTax: number;

  @ApiProperty({
    description: 'Precio con impuesto incluido',
    example: 177.86,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithTax: number;

  @ApiProperty({
    description: 'Subtotal (cantidad * precio con impuesto)',
    example: 533.58,
  })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de impuesto aplicado',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  taxeTypeId?: number;
}

@OnlyOneDefined(['productId', 'accommodationId', 'excursionId'], {
  message:
    'Debes especificar exactamente uno entre productId, accommodationId o excursionId',
})
export class UpdateInvoiceDto {
  @ApiProperty({
    description: 'ID de la factura a actualizar',
    example: 101,
  })
  @IsNumber()
  @IsNotEmpty()
  invoiceId: number;

  @ApiProperty({
    description: 'ID del tipo de factura',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  invoiceTypeId: number;

  @ApiProperty({
    description: 'Código único de la factura',
    example: 'INV-2025-0001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Fecha de inicio de la factura (formato ISO 8601)',
    example: '2025-05-28T00:00:00Z',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin de la factura (formato ISO 8601)',
    example: '2025-06-28T00:00:00Z',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Detalles que componen la factura',
    type: [InvoiceDetailDto],
  })
  @ArrayNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceDetailDto)
  details: InvoiceDetailDto[];
}
