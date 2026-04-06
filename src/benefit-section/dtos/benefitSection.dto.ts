import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBenefitItemDto {
  @ApiProperty({ example: 'Aparcamiento' })
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @ApiPropertyOptional({ example: 'Estacionamiento' })
  @IsOptional()
  @IsString()
  name?: string;

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
  @ApiProperty({ example: 'Beneficios y servicios' })
  @IsString()
  @IsNotEmpty()
  title: string;

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
  @ApiPropertyOptional({ example: 'Beneficios y servicios' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
