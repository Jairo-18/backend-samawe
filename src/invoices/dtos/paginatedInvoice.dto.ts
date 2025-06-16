import { OrderConst } from './../../shared/constants/order.constants';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PaginatedListInvoicesParamsDto extends ParamsPaginationDto {
  @ApiPropertyOptional({ enum: OrderConst, default: OrderConst.DESC })
  @IsOptional()
  override order?: OrderConst = OrderConst.DESC;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de factura',
    required: false,
  })
  @IsOptional()
  @IsString()
  invoiceTypeId?: number;

  @ApiProperty({
    example: 'EXC-001',
    description: 'Código de la factura',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  invoiceElectronic?: boolean;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre del cliente',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiProperty({
    example: 'Ana Torres',
    description: 'Nombre del empleado',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeName?: string;

  @ApiProperty({
    example: 1,
    description:
      'ID del tipo de identificación del cliente (1=CC, 2=NIT, 3=CE, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  identificationTypeId?: number;

  @ApiProperty({
    example: '2024-06-01',
    description: 'Fecha de creación (desde)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @ApiProperty({
    example: '2024-06-30',
    description: 'Fecha de creación (hasta)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdAtTo?: string;

  @ApiProperty({
    example: '2024-06-15',
    description: 'Fecha de salida (startDate)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: 1,
    description: 'ID del tipo de pago',
    required: false,
  })
  @IsOptional()
  @IsString()
  payTypeId?: number;

  @ApiProperty({
    example: 2,
    description: 'ID del tipo de estado de pago',
    required: false,
  })
  @IsOptional()
  @IsString()
  paidTypeId?: number;

  @ApiProperty({
    example: 999.99,
    description: 'Total de la factura',
    required: false,
  })
  @IsOptional()
  @IsString()
  total?: number;

  @ApiProperty({
    example: 3,
    description: 'ID del tipo de impuesto',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxeTypeId?: number;
}
