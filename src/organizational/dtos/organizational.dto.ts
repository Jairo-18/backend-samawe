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

  @ApiPropertyOptional({ example: '#FFB74D' })
  @IsOptional()
  @IsString()
  tertiaryColor?: string;

  // Home
  @ApiPropertyOptional({ example: 'Bienvenidos a Eco Hotel' })
  @IsOptional()
  @IsString()
  homeTitle?: string;

  @ApiPropertyOptional({ example: 'Un refugio natural exclusivo...' })
  @IsOptional()
  @IsString()
  homeDescription?: string;

  @ApiPropertyOptional({ example: 'Experiencias' })
  @IsOptional()
  @IsString()
  experienceTitle?: string;

  @ApiPropertyOptional({ example: 'Sumérgete en la tranquilidad...' })
  @IsOptional()
  @IsString()
  experienceDescription?: string;

  @ApiPropertyOptional({ example: 'Reserva tu escapada' })
  @IsOptional()
  @IsString()
  reservationTitle?: string;

  @ApiPropertyOptional({ example: 'Las fechas más deseadas...' })
  @IsOptional()
  @IsString()
  reservationDescription?: string;

  // About Us
  @ApiPropertyOptional({ example: 'Conoce la esencia de Río de Oro' })
  @IsOptional()
  @IsString()
  aboutUsTitle?: string;

  @ApiPropertyOptional({ example: 'En San Rafael, rodeado de montañas...' })
  @IsOptional()
  @IsString()
  aboutUsDescription?: string;

  @ApiPropertyOptional({ example: 'Misión' })
  @IsOptional()
  @IsString()
  missionTitle?: string;

  @ApiPropertyOptional({ example: 'Brindar experiencias de hospedaje...' })
  @IsOptional()
  @IsString()
  missionDescription?: string;

  @ApiPropertyOptional({ example: 'Visión' })
  @IsOptional()
  @IsString()
  visionTitle?: string;

  @ApiPropertyOptional({ example: 'Ser reconocidos en el 2030...' })
  @IsOptional()
  @IsString()
  visionDescription?: string;

  @ApiPropertyOptional({ example: 'Nuestra Historia' })
  @IsOptional()
  @IsString()
  historyTitle?: string;

  @ApiPropertyOptional({ example: 'El Ecohotel nació como un sueño familiar...' })
  @IsOptional()
  @IsString()
  historyDescription?: string;

  // Gastronomy
  @ApiPropertyOptional({ example: 'Sabores que fluyen como el río' })
  @IsOptional()
  @IsString()
  gastronomyTitle?: string;

  @ApiPropertyOptional({ example: 'Nuestra cocina combina...' })
  @IsOptional()
  @IsString()
  gastronomyDescription?: string;

  @ApiPropertyOptional({ example: 'Nuestra Historia' })
  @IsOptional()
  @IsString()
  gastronomyHistoryTitle?: string;

  @ApiPropertyOptional({ example: 'Nacimos como un lugar de encuentro...' })
  @IsOptional()
  @IsString()
  gastronomyHistoryDescription?: string;

  @ApiPropertyOptional({ example: 'Nuestra cocina' })
  @IsOptional()
  @IsString()
  gastronomyKitchenTitle?: string;

  @ApiPropertyOptional({ example: 'En Río de Oro creemos que...' })
  @IsOptional()
  @IsString()
  gastronomyKitchenDescription?: string;

  @ApiPropertyOptional({ example: 'Ingredientes con historia' })
  @IsOptional()
  @IsString()
  gastronomyIngredientsTitle?: string;

  @ApiPropertyOptional({ example: 'Trabajamos con productos locales...' })
  @IsOptional()
  @IsString()
  gastronomyIngredientsDescription?: string;

  // Accommodations
  @ApiPropertyOptional({ example: 'Habitaciones' })
  @IsOptional()
  @IsString()
  accommodationsTitle?: string;

  @ApiPropertyOptional({ example: 'Santuarios privados diseñados...' })
  @IsOptional()
  @IsString()
  accommodationsDescription?: string;

  // How to Arrive
  @ApiPropertyOptional({ example: 'Terminal del norte, flota sotrasanvicente...' })
  @IsOptional()
  @IsString()
  howToArrivePublicTransportDescription?: string;

  @ApiPropertyOptional({ example: 'Autopista Medellín Bogotá, Rionegro...' })
  @IsOptional()
  @IsString()
  howToArrivePrivateTransportDescription?: string;

  @ApiPropertyOptional({ example: 'La vía de ingreso es pavimentada...' })
  @IsOptional()
  @IsString()
  accessibilityDescription?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=...' })
  @IsOptional()
  @IsString()
  mapsUrl?: string;

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

export class CreateCorporateValueDto {
  @ApiProperty({ example: 'Sostenibilidad' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Cuidamos el entorno natural...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
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
