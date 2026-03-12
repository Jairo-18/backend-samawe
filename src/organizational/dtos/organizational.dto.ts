import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from '../../shared/dtos/response.dto';
import { Organizational } from '../../shared/entities/organizational.entity';

export class CreateOrganizationalDto {
  @ApiProperty({ example: 'Eco Hotel Samawé' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Eco Hotel Samawé Putumayo S.A.S.' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ example: 'eco-hotel-samawe' })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: '900123456-1' })
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @ApiPropertyOptional({ example: 'contacto@ecohotelsamawe.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '3102103660' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://ecohotelsamawe.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Km 10 Vía al Putumayo' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mocoa' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  languageDefault?: string;

  @ApiPropertyOptional({ example: 'Descripción del hotel...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#2E7D32' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#81C784' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: 'Eco Hotel Samawé | Naturaleza y Bienestar' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Descubre el mejor eco hotel del Putumayo.' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  paymentEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: 'Putumayo' })
  @IsOptional()
  @IsString()
  department?: string;

  /** IDs de relaciones opcionales */
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  identificationType?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  personType?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  phoneCode?: number;
}

export class UpdateOrganizationalDto extends CreateOrganizationalDto {}

export class CreateOrganizationalMediaDto {
  @ApiProperty({ example: 'https://cdn.example.com/logo.png' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'Logo principal' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'organizational/abc-123.webp' })
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 1,
    description: 'ID del MediaType (logo, favicon, etc.)',
  })
  mediaTypeId: number;
}

export class UpdateOrganizationalMediaDto extends CreateOrganizationalMediaDto {}

export class GetOrganizationalResponseDto implements BaseResponseDto {
  @ApiProperty({ type: Number, example: HttpStatus.OK })
  statusCode: number;

  @ApiProperty({ type: Object })
  data: Organizational;
}

export class GetOrganizationalMediaMapResponseDto implements BaseResponseDto {
  @ApiProperty({ type: Number, example: HttpStatus.OK })
  statusCode: number;

  @ApiProperty({
    type: Object,
    example: {
      logo: { url: 'https://...', label: 'Logo' },
      home_hero: [{ url: 'https://...', priority: 0 }],
    },
  })
  data: Record<string, any>;
}
