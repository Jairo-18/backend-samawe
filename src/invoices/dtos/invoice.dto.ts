import {
  CategoryTypeDto,
  InvoiceTypeDto,
  PaidTypeDto,
  PayTypeDto,
  TaxeTypeDto,
} from './../../shared/dtos/types.dto';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
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
  IsBoolean,
} from 'class-validator';

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

  @ApiProperty({
    example: false,
    description: 'False y True',
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'Es factura electronica reeuqerido' })
  invoiceElectronic: boolean;

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

  @IsBoolean()
  invoiceElectronic: boolean;
}

export class UserMiniDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  identificationNumber: string;
}

export class ProductMiniDto {
  @ApiProperty()
  productId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ type: () => CategoryTypeDto })
  categoryType: CategoryTypeDto;
}

export class AccommodationMiniDto {
  @ApiProperty()
  accommodationId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ type: () => CategoryTypeDto })
  categoryType: CategoryTypeDto;
}

export class ExcursionMiniDto {
  @ApiProperty()
  excursionId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ type: () => CategoryTypeDto })
  categoryType: CategoryTypeDto;
}

export class InvoiceDetailDto {
  @ApiProperty()
  invoiceDetailId: number;

  @ApiProperty({ required: false })
  amount?: number;

  @ApiProperty()
  priceWithoutTax: string;

  @ApiProperty()
  priceWithTax: string;

  @ApiProperty()
  subtotal: string;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ type: () => TaxeTypeDto, required: false })
  taxeType?: TaxeTypeDto;

  @ApiProperty({ type: () => ProductMiniDto, required: false })
  product?: ProductMiniDto;

  @ApiProperty({ type: () => AccommodationMiniDto, required: false })
  accommodation?: AccommodationMiniDto;

  @ApiProperty({ type: () => ExcursionMiniDto, required: false })
  excursion?: ExcursionMiniDto;
}

export class GetInvoiceWithDetailsDto {
  @ApiProperty()
  invoiceId: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  invoiceElectronic: boolean;

  @ApiProperty()
  subtotalWithoutTax: string;

  @ApiProperty()
  subtotalWithTax: string;

  @ApiProperty()
  total: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ required: false })
  deletedAt?: Date;

  @ApiProperty({ type: () => InvoiceTypeDto })
  invoiceType: InvoiceTypeDto;

  @ApiProperty({ type: () => PayTypeDto })
  payType: PayTypeDto;

  @ApiProperty({ type: () => PaidTypeDto })
  paidType: PaidTypeDto;

  @ApiProperty({ type: () => UserMiniDto })
  user: UserMiniDto;

  @ApiProperty({ type: () => UserMiniDto })
  employee: UserMiniDto;

  @ApiProperty({ type: () => [InvoiceDetailDto] })
  invoiceDetails: InvoiceDetailDto[];
}

export class GetInvoiceWithDetailsResponseDto implements BaseResponseDto {
  @ApiProperty({
    example: HttpStatus.OK,
  })
  statusCode: number;

  @ApiProperty({
    type: () => GetInvoiceWithDetailsDto,
  })
  data: GetInvoiceWithDetailsDto;
}
