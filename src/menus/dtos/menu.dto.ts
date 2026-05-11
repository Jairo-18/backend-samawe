import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsArray,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';
import { ParamsPaginationDto } from './../../shared/dtos/pagination.dto';
import { TranslatedInput } from '../../shared/types/translated-field.type';

export class CreateMenuDto {
  @ApiProperty({ example: { es: 'Menú Gourmet' } })
  @IsObject()
  @IsNotEmpty()
  name: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Selección de platillos premium' } })
  @IsObject()
  @IsOptional()
  description?: TranslatedInput;

  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos un platillo al menú' })
  @IsNumber({}, { each: true })
  productIds: number[];

  @ApiPropertyOptional({ example: 'uuid-de-organizacion' })
  @IsOptional()
  organizationalId?: string;
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ example: { es: 'Menú VIP' } })
  @IsObject()
  @IsOptional()
  name?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Platillos exclusivos para clientes VIP' } })
  @IsObject()
  @IsOptional()
  description?: TranslatedInput;

  @ApiPropertyOptional({ example: [1, 3, 5], type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  productIds?: number[];

  @ApiPropertyOptional({ example: 'uuid-de-organizacion' })
  @IsOptional()
  organizationalId?: string;
}

export class PaginatedMenuParamsDto extends ParamsPaginationDto {}
