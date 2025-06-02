import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedListInvoicesParamsDto extends ParamsPaginationDto {
  @ApiProperty({
    example: 2,
    description: 'ID del tipo de factura',
    required: false,
  })
  @IsOptional()
  @IsString()
  invoiceType?: number;

  @ApiProperty({
    example: 'EXC-001',
    description: 'Código de la factura',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

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
  clientIdentificationType?: number;

  @ApiProperty({
    example: 1,
    description:
      'ID del tipo de identificación del empleado (1=CC, 2=NIT, 3=CE, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeIdentificationType?: number;

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
