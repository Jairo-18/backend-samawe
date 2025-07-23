import { PaidType } from './../../shared/entities/paidType.entity';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { PayType } from './../../shared/entities/payType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { IdentificationType } from 'src/user/models/user.model';
import { Type } from 'class-transformer';

export class CreateInvoiceDetailDto {
  @ApiPropertyOptional({
    description: 'ID del producto asociado al detalle',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({
    description: 'ID del hospedaje asociado al detalle',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  accommodationId?: number;

  @ApiPropertyOptional({
    description: 'ID de la excursión asociada al detalle',
    example: 0,
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

  @ApiPropertyOptional({
    description: ' NUEVO: Precio de compra histórico (opcional)',
    example: 800.0,
  })
  @IsOptional()
  @IsNumber()
  priceBuy?: number;

  @ApiProperty({
    description: 'Precio unitario sin impuestos',
    example: 1200.0,
  })
  @IsNumber()
  @IsNotEmpty()
  priceWithoutTax: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de impuesto aplicado al ítem',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  taxeTypeId?: number;

  @ApiPropertyOptional({
    description: 'Fecha de entrada (solo para hospedaje o excursión)',
    example: '2025-06-15T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de salida (solo para hospedaje o excursión)',
    example: '2025-06-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}

export class CreateMultipleInvoiceDetailsDto {
  @ApiProperty({
    type: CreateInvoiceDetailDto,
    isArray: true,
    description: 'Lista de detalles a agregar',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceDetailDto)
  details: CreateInvoiceDetailDto[];
}

export interface CreateRelatedDataInvoiceDto {
  categoryType: CategoryType[];
  invoiceType?: InvoiceType[];
  taxeType: TaxeType[];
  payType: PayType[];
  paidType: PaidType[];
  identificationType: IdentificationType[];
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
