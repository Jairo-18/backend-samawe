import { ApiProperty } from '@nestjs/swagger';

export class PayTypeDto {
  @ApiProperty({
    example: 2,
    description: 'ID del tipo de pago (PayType)',
  })
  payTypeId: number;

  @ApiProperty({
    example: 'PAG',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'PAGADO',
    description: 'Nombre del tipo de pago',
  })
  name?: string;
}

export class InvoiceTypeDto {
  @ApiProperty({
    example: 2,
    description: 'ID del tipo de factura (InvoiceType)',
  })
  invoiceTypeId: number;

  @ApiProperty({
    example: 'FV',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'FACTURA DE VENTA',
    description: 'Nombre del tipo de factura',
  })
  name?: string;
}

export class PaidTypeDto {
  @ApiProperty({
    example: 2,
    description: 'ID del tipo de estado pago (PaidType)',
  })
  paidTypeId: number;

  @ApiProperty({
    example: 'EFE',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'EFECTIVO',
    description: 'Nombre del tipo de estado de pago',
  })
  name?: string;
}

export class CategoryTypeDto {
  @ApiProperty({
    example: 2,
    description: 'ID del tipo de estado pago (CategoryType)',
  })
  categoryTypeId: number;

  @ApiProperty({
    example: 'MEC',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'MECATO',
    description: 'Nombre del tipo de categoría',
  })
  name?: string;
}

export class BedTypeDto {
  @ApiProperty({
    example: 2,
    description: 'Identificador único del tipo de cama',
  })
  bedTypeId: number;

  @ApiProperty({
    example: 'CD',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'CAMA DOBLE',
    description: 'Nombre del tipo de cama',
  })
  name?: string;
}

export class IdentificationTypeDto {
  @ApiProperty({
    example: 2,
    description: 'Identificador único de la identificación',
  })
  identificationTypeId: number;

  @ApiProperty({
    example: 'CC',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'CEDULA DE CIUDADANIA',
    description: 'Nombre del tipo de identificación',
  })
  name?: string;
}

export class PhoneCodeDto {
  @ApiProperty({
    example: 2,
    description: 'Identificador único de código de país',
  })
  phoneCodeId: number;

  @ApiProperty({
    example: '+57',
    description: 'Tipo de código',
  })
  code?: string;

  @ApiProperty({
    example: 'COLOMBIA',
    description: 'Nombre del tipo de código de país',
  })
  name?: string;
}

export class TaxeTypeDto {
  @ApiProperty()
  taxeTypeId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  percentage?: number;
}
