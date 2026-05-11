import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { BaseResponseDto } from '../../shared/dtos/response.dto';
import { Organizational } from '../../shared/entities/organizational.entity';
import { TranslatedInput } from '../../shared/types/translated-field.type';

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

  @ApiPropertyOptional({ example: { es: 'Descripción del hotel...' } })
  @IsOptional()
  @IsObject()
  description?: TranslatedInput;

  @ApiPropertyOptional({ example: '#2E7D32' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#81C784' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#FFB74D' })
  @IsOptional()
  @IsString()
  tertiaryColor?: string;

  @ApiPropertyOptional({ example: '#2B2B2B' })
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional({ example: '#11382E' })
  @IsOptional()
  @IsString()
  titleColor?: string;

  @ApiPropertyOptional({ example: '#486E2B' })
  @IsOptional()
  @IsString()
  subtitleColor?: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsString()
  bgPrimaryColor?: string;

  @ApiPropertyOptional({ example: '#F3F7F0' })
  @IsOptional()
  @IsString()
  bgSecondaryColor?: string;

  @ApiPropertyOptional({ example: { es: 'Bienvenidos' } })
  @IsOptional()
  @IsObject()
  homeTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Un refugio natural...' } })
  @IsOptional()
  @IsObject()
  homeDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Experiencias' } })
  @IsOptional()
  @IsObject()
  experienceTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Sumérgete...' } })
  @IsOptional()
  @IsObject()
  experienceDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Reserva tu escapada' } })
  @IsOptional()
  @IsObject()
  reservationTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Las fechas más deseadas...' } })
  @IsOptional()
  @IsObject()
  reservationDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Quiénes somos' } })
  @IsOptional()
  @IsObject()
  aboutUsTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'En el corazón de...' } })
  @IsOptional()
  @IsObject()
  aboutUsDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Misión' } })
  @IsOptional()
  @IsObject()
  missionTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Brindar experiencias...' } })
  @IsOptional()
  @IsObject()
  missionDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Visión' } })
  @IsOptional()
  @IsObject()
  visionTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Ser reconocidos...' } })
  @IsOptional()
  @IsObject()
  visionDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Nuestra Historia' } })
  @IsOptional()
  @IsObject()
  historyTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Nació como un sueño...' } })
  @IsOptional()
  @IsObject()
  historyDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Gastronomía' } })
  @IsOptional()
  @IsObject()
  gastronomyTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Nuestra cocina...' } })
  @IsOptional()
  @IsObject()
  gastronomyDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Historia culinaria' } })
  @IsOptional()
  @IsObject()
  gastronomyHistoryTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Nacimos como...' } })
  @IsOptional()
  @IsObject()
  gastronomyHistoryDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Nuestra cocina' } })
  @IsOptional()
  @IsObject()
  gastronomyKitchenTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Creemos que...' } })
  @IsOptional()
  @IsObject()
  gastronomyKitchenDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Ingredientes con historia' } })
  @IsOptional()
  @IsObject()
  gastronomyIngredientsTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Productos locales...' } })
  @IsOptional()
  @IsObject()
  gastronomyIngredientsDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Hospedajes' } })
  @IsOptional()
  @IsObject()
  accommodationsTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Cabañas diseñadas...' } })
  @IsOptional()
  @IsObject()
  accommodationsDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Para llegar...' } })
  @IsOptional()
  @IsObject()
  howToArriveDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Terminal del norte...' } })
  @IsOptional()
  @IsObject()
  howToArrivePublicTransportDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Autopista...' } })
  @IsOptional()
  @IsObject()
  howToArrivePrivateTransportDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'La vía es pavimentada...' } })
  @IsOptional()
  @IsObject()
  accessibilityDescription?: TranslatedInput;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=...' })
  @IsOptional()
  @IsString()
  mapsUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.youtube.com/embed/abc123' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.facebook.com/ecohotelsamawe' })
  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.instagram.com/ecohotelsamawe' })
  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @ApiPropertyOptional({ example: { es: 'Eco Hotel Samawé | Naturaleza y Bienestar' } })
  @IsOptional()
  @IsObject()
  metaTitle?: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Descubre el mejor eco hotel del Putumayo.' } })
  @IsOptional()
  @IsObject()
  metaDescription?: TranslatedInput;

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

export class CreateCorporateValueDto {
  @ApiProperty({ example: { es: 'Sostenibilidad', en: 'Sustainability' } })
  @IsObject()
  title: TranslatedInput;

  @ApiPropertyOptional({ example: { es: 'Cuidamos el entorno natural...' } })
  @IsOptional()
  @IsObject()
  description?: TranslatedInput;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/sostenibilidad.webp' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateCorporateValueDto extends CreateCorporateValueDto {}

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
