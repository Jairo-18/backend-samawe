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
    example: { es: 'PAGADO' },
    description: 'Nombre del tipo de pago',
  })
  name?: Record<string, string>;
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
    example: { es: 'FACTURA DE VENTA' },
    description: 'Nombre del tipo de factura',
  })
  name?: Record<string, string>;
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
    example: { es: 'EFECTIVO' },
    description: 'Nombre del tipo de estado de pago',
  })
  name?: Record<string, string>;
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
    example: { es: 'MECATO' },
    description: 'Nombre del tipo de categoría',
  })
  name?: Record<string, string>;
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
    example: { es: 'CAMA DOBLE' },
    description: 'Nombre del tipo de cama',
  })
  name?: Record<string, string>;
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
    example: { es: 'CEDULA DE CIUDADANIA' },
    description: 'Nombre del tipo de identificación',
  })
  name?: Record<string, string>;
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
  name: Record<string, string>;

  @ApiProperty()
  percentage?: number;
}
