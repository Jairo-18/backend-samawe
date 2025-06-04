import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import { OnlyOneDefined } from '../../shared/validators/onlyOneDefined';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsArray,
  IsUUID,
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

  @ApiProperty({
    example: '538fd155-0392-4e67-bacb-99ad8796ce80',
    description: 'ID del cliente (User) al que va dirigida la factura',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'El cliente (userId) es requerido' })
  userId: string;

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

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de pago (PayType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El tipo de pago es requerido' })
  payTypeId: number;

  @ApiProperty({
    example: 1,
    description: 'ID del estado de pago (PaidType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El estado de pago es requerido' })
  paidTypeId: number;
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
    example: 1,
    description: 'ID del tipo de pago (PayType)',
  })
  @IsNumber()
  @IsOptional()
  payTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del estado de pago (PaidType)',
  })
  @IsNumber()
  @IsOptional()
  paidTypeId?: number;

  @ApiProperty({
    example: 'b78e8f08-9df4-4f7f-abc0-1b6ef3147a2e',
    description: 'UUID del cliente (usuario)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
