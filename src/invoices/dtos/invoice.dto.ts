import {
  IdentificationTypeDto,
  InvoiceTypeDto,
  PaidTypeDto,
  PayTypeDto,
} from './../../shared/dtos/types.dto';
import { BaseResponseDto } from './../../shared/dtos/response.dto';
import { OnlyOneDefined } from '../../shared/validators/onlyOneDefined';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsArray,
  IsUUID,
  IsBoolean,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceDetailDto } from './invoiceDetaill.dto';

export class CreateInvoiceDto {
  @ApiProperty({
    example: 1,
    description: 'Tipo de factura (relación con invoiceType)',
    required: true,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El tipo es requerido' })
  invoiceTypeId: number;

  @ApiProperty({
    example: 'Excursión a la montaña con guía y refrigerios',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({
    example: 'eae05031-a181-4175-b09c-90177ef87f9b',
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
  @IsOptional()
  invoiceElectronic?: boolean;

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
    required: false,
  })
  @IsNumber()
  @IsOptional()
  payTypeId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID del estado de pago (PaidType)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  paidTypeId?: number;

  @ApiProperty({
    example: 0,
    description: 'Monto transferido',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  transfer?: number;

  @ApiProperty({
    example: 0,
    description: 'Monto en efectivo',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  cash?: number;

  @ApiProperty()
  details?: CreateInvoiceDetailDto[];
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

export class UpdateInvoiceDto {
  @ApiProperty({
    description: 'ID de la factura a actualizar',
    example: 101,
  })
  @IsNumber()
  @IsNotEmpty()
  invoiceId: number;

  @ApiProperty({
    example: 'Excursión a la montaña con guía y refrigerios',
    description: 'Descripción de la excursión',
    required: false,
  })
  @IsOptional()
  @IsString()
  observations?: string;

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
    example: 0,
    description: 'Monto transferido',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  transfer?: number;

  @ApiProperty({
    example: 0,
    description: 'Monto en efectivo',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  cash?: number;

  @ApiProperty({
    example: true,
    description: 'Factura electrónica',
  })
  @IsBoolean()
  @IsOptional()
  invoiceElectronic?: boolean;
}

export class EmployeMiniDto {
  @ApiProperty({
    example: 'eae05031-a181-4175-b09c-90177ef87f9b',
    description: 'ID de usuario',
  })
  userId: string;

  @ApiProperty({
    example: 'MIGUEL CAMILO',
    description: 'Nombres del cliente',
  })
  firstName: string;

  @ApiProperty({
    example: 'GONZALEZ RAMIREZ',
    description: 'Apellidos del cliente',
  })
  lastName: string;

  @ApiProperty({
    example: 1120055420,
    description: 'Identificación del cliente',
  })
  identificationNumber: string;
}

export class UserMiniDto {
  @ApiProperty({
    example: 'eae05031-a181-4175-b09c-90177ef87f9b',
    description: 'ID de usuario',
  })
  userId: string;

  @ApiProperty({
    example: 'MIGUEL CAMILO',
    description: 'Nombres del cliente',
  })
  firstName: string;

  @ApiProperty({
    example: 'GONZALEZ RAMIREZ',
    description: 'Apellidos del cliente',
  })
  lastName: string;

  @ApiProperty({
    example: 1120055420,
    description: 'Identificación del cliente',
  })
  identificationNumber: string;

  @ApiProperty({ type: () => IdentificationTypeDto })
  identificationType: IdentificationTypeDto;
}

export class ProductMiniDto {
  @ApiProperty({
    example: 2,
    description: 'ID del producto',
  })
  productId: number;

  @ApiProperty({
    example: 'COC',
    description: 'Código del producto',
  })
  code: string;

  @ApiProperty({
    example: 'Coca Cola 500ml',
    description: 'Nombre del producto',
  })
  name: string;
}

export class AccommodationMiniDto {
  @ApiProperty({
    example: 2,
    description: 'ID del hospedaje',
  })
  accommodationId: number;

  @ApiProperty({
    example: 'CAB1',
    description: 'Código del hospedaje',
  })
  code: string;

  @ApiProperty({
    example: 'Cabaña 1',
    description: 'Nombre del hospedaje',
  })
  name: string;
}

export class ExcursionMiniDto {
  @ApiProperty({
    example: 2,
    description: 'ID del servicio o pasadía',
  })
  excursionId: number;

  @ApiProperty({
    example: 'PAS',
    description: 'Código del servicio o pasadía',
  })
  code: string;

  @ApiProperty({
    example: 'Pasadía niños',
    description: 'Nombre del servicio o pasadía',
  })
  name: string;
}

export class InvoiceDetailDto {
  @ApiProperty({
    example: 2,
    description: 'ID del detalle de la factura',
  })
  invoiceDetailId: number;

  @ApiProperty({
    example: 5,
    description: 'Monto de ese detalle',
  })
  amount?: number;

  @ApiProperty({
    example: 1000,
    description: 'Precio sin impuesto',
  })
  priceWithoutTax: string;

  @ApiProperty({
    example: 1100,
    description: 'Precio con impuesto',
  })
  priceWithTax: string;

  @ApiProperty({
    example: 5500,
    description: 'Precio total (amount * priceWithTax)',
  })
  subtotal: string;

  @ApiProperty()
  taxe?: string;

  @ApiProperty({
    example: '2024-06-01',
    description: 'Fecha creación del detalle',
  })
  startDate?: Date;

  @ApiProperty({
    example: '2024-06-01',
    description: 'Fecha creación del detalle',
  })
  endDate?: Date;

  @ApiProperty({ type: () => ProductMiniDto, required: false })
  product?: ProductMiniDto;

  @ApiProperty({ type: () => AccommodationMiniDto, required: false })
  accommodation?: AccommodationMiniDto;

  @ApiProperty({ type: () => ExcursionMiniDto, required: false })
  excursion?: ExcursionMiniDto;
}

export class GetInvoiceWithDetailsDto {
  @ApiProperty({
    example: 100,
    description: 'ID de factura',
  })
  invoiceId: number;

  @ApiProperty({
    example: '00012',
    description: 'Codigo de la factura',
  })
  code: string;

  @ApiProperty({
    example: 'Esta factura corresponde a la venta de miguel gonzalez',
    description: 'Descripción de la factura',
  })
  observations: string;

  @ApiProperty({
    example: true,
    description: 'Si es factura electrónica true, false de lo contrario',
  })
  invoiceElectronic: boolean;

  @ApiProperty({
    example: 10000,
    description: 'Total de la factura',
  })
  subtotalWithoutTax: string;

  @ApiProperty({
    example: 100000,
    description: 'Total de la factura',
  })
  subtotalWithTax: string;

  @ApiProperty({
    example: 110000,
    description: 'Total de la factura',
  })
  total: string;

  @ApiProperty({
    example: 10000,
    description: 'Total de la factura',
  })
  totalTaxes: number;

  @ApiProperty({
    example: 10000,
    description:
      'Por transferencia en caso de que sea por tranferencia y efectivo',
  })
  transfer: number;

  @ApiProperty({
    example: 100000,
    description:
      'Por transferencia en caso de que sea por tranferencia y efectivo',
  })
  cash: number;

  @ApiProperty({ type: () => InvoiceTypeDto })
  invoiceType: InvoiceTypeDto;

  @ApiProperty({ type: () => PayTypeDto })
  payType: PayTypeDto;

  @ApiProperty({ type: () => PaidTypeDto })
  paidType: PaidTypeDto;

  @ApiProperty({ type: () => EmployeMiniDto })
  employee: EmployeMiniDto;

  @ApiProperty({ type: () => UserMiniDto })
  user: UserMiniDto;

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
