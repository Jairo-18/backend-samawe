import { ApiProperty } from '@nestjs/swagger';

export class BaseTypeDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;
}

export class PayTypeDto extends BaseTypeDto {
  @ApiProperty()
  payTypeId: number;
}

export class InvoiceTypeDto extends BaseTypeDto {
  @ApiProperty()
  invoiceTypeId: number;
}

export class PaidTypeDto extends BaseTypeDto {
  @ApiProperty()
  paidTypeId: number;
}

export class CategoryTypeDto extends BaseTypeDto {
  @ApiProperty()
  categoryTypeId: number;
}

export class BedTypeDto extends BaseTypeDto {
  @ApiProperty()
  bedTypeId: number;
}

export class IdentificationTypeDto extends BaseTypeDto {
  @ApiProperty()
  identificationTypeId: number;
}

export class PhoneCodeDto extends BaseTypeDto {
  @ApiProperty()
  phoneCodeId: number;
}

export class TaxeTypeDto {
  @ApiProperty()
  taxeTypeId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  percentage?: number;
}
