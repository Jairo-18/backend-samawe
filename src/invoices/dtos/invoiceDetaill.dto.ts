import { PaidType } from './../../shared/entities/paidType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { PayType } from './../../shared/entities/payType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateInvoiceDetailDto {
  @ApiPropertyOptional({
    description: 'ID del producto asociado al detalle',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({
    description: 'ID del hospedaje asociado al detalle',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  accommodationId?: number;

  @ApiPropertyOptional({
    description: 'ID de la excursión asociada al detalle',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  excursionId?: number;

  @ApiProperty({
    description: 'Cantidad de unidades de este ítem',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Precio unitario sin impuestos',
    example: 100.0,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithoutTax: number;

  @ApiProperty({
    description: 'Precio unitario con impuestos incluidos',
    example: 118.0,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithTax: number;

  @ApiProperty({
    description: 'Subtotal del ítem (cantidad * precio con impuestos)',
    example: 236.0,
  })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de impuesto aplicado al ítem',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  taxeTypeId?: number;
}

export class UpdateInvoiceDetailDto {
  @ApiProperty({
    description: 'ID del detalle de factura',
    example: 123,
  })
  @IsNumber()
  @IsNotEmpty()
  invoiceDetailId: number;

  @ApiPropertyOptional({
    description: 'ID del producto asociado al detalle',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({
    description: 'ID del hospedaje asociado al detalle',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  accommodationId?: number;

  @ApiPropertyOptional({
    description: 'ID de la excursión asociada al detalle',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  excursionId?: number;

  @ApiProperty({
    description: 'Cantidad de unidades de este ítem',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Precio unitario sin impuestos',
    example: 100.0,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithoutTax: number;

  @ApiProperty({
    description: 'Precio unitario con impuestos incluidos',
    example: 118.0,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithTax: number;

  @ApiProperty({
    description: 'Subtotal del ítem (cantidad * precio con impuestos)',
    example: 236.0,
  })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de impuesto aplicado al ítem',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  taxeTypeId?: number;
}

export interface CreateRelatedDataInvoiceDto {
  invoiceType?: InvoiceType[];
  taxeType: TaxeType[];
  payType: PayType[];
  paidType: PaidType[];
}

export class CreateRelatedDataInvoiceResponseDto implements BaseResponseDto {
  @ApiProperty({
    type: Number,
    example: HttpStatus.OK,
  })
  statusCode: number;
  @ApiProperty({
    type: Object,
    example: 'Datos relacionados para factura y detalle factura',
  })
  data: CreateRelatedDataInvoiceDto;
}
