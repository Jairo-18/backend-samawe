import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TranslatedInput } from '../../shared/types/translated-field.type';

export class CreateBenefitItemDto {
  @ApiProperty({ example: { es: 'Aparcamiento' } })
  @IsObject()
  @IsNotEmpty()
  name: TranslatedInput;

  @ApiProperty({ example: 'local_parking' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateBenefitItemDto {
  @ApiPropertyOptional({ example: { es: 'Estacionamiento' } })
  @IsOptional()
  @IsObject()
  name?: TranslatedInput;

  @ApiPropertyOptional({ example: 'local_parking' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateBenefitSectionDto {
  @ApiProperty({ example: { es: 'Beneficios y servicios' } })
  @IsObject()
  @IsNotEmpty()
  title: TranslatedInput;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [CreateBenefitItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBenefitItemDto)
  items?: CreateBenefitItemDto[];
}

export class UpdateBenefitSectionDto {
  @ApiPropertyOptional({ example: { es: 'Beneficios y servicios' } })
  @IsOptional()
  @IsObject()
  title?: TranslatedInput;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
