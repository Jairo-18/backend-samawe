import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LEGAL_TYPE, LegalType } from '../constants/legal.constants';
import { TranslatedInput } from '../../shared/types/translated-field.type';

export class CreateLegalItemChildDto {
  @ApiProperty({ example: { es: 'Razón social: Samawe Putumayo S.A.S. Zomac' } })
  @IsObject()
  @IsNotEmpty()
  content: TranslatedInput;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateLegalItemChildDto {
  @ApiPropertyOptional({ example: { es: 'Razón social: Samawe Putumayo S.A.S. Zomac' } })
  @IsOptional()
  @IsObject()
  content?: TranslatedInput;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateLegalItemDto {
  @ApiPropertyOptional({ example: { es: '1. Responsable del tratamiento' } })
  @IsOptional()
  @IsObject()
  title?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'En cumplimiento de la Ley 1581 de 2012...' } })
  @IsOptional()
  @IsObject()
  description?: TranslatedInput;

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
  @ApiPropertyOptional({ example: { es: '1. Responsable del tratamiento' } })
  @IsOptional()
  @IsObject()
  title?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'En cumplimiento de la Ley 1581 de 2012...' } })
  @IsOptional()
  @IsObject()
  description?: TranslatedInput;

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
