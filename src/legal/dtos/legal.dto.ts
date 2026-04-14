import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LEGAL_TYPE, LegalType } from '../constants/legal.constants';

export class CreateLegalItemChildDto {
  @ApiProperty({ example: 'Razón social: Samawe Putumayo S.A.S. Zomac' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateLegalItemChildDto {
  @ApiPropertyOptional({ example: 'Razón social: Samawe Putumayo S.A.S. Zomac' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateLegalItemDto {
  @ApiPropertyOptional({ example: '1. Responsable del tratamiento' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'En cumplimiento de la Ley 1581 de 2012...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [CreateLegalItemChildDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLegalItemChildDto)
  children?: CreateLegalItemChildDto[];
}

export class UpdateLegalItemDto {
  @ApiPropertyOptional({ example: '1. Responsable del tratamiento' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'En cumplimiento de la Ley 1581 de 2012...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class CreateLegalSectionDto {
  @ApiProperty({ enum: Object.values(LEGAL_TYPE), example: LEGAL_TYPE.TERMS })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(LEGAL_TYPE))
  type: LegalType;

  @ApiPropertyOptional({ type: [CreateLegalItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLegalItemDto)
  items?: CreateLegalItemDto[];
}
