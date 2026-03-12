import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ExcursionImageResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la imagen de excursión',
  })
  excursionImageId: number;

  @ApiProperty({
    example: 'https://res ',
    description: 'URL de la imagen',
  })
  imageUrl: string;

  @ApiProperty({
    example: 'excursions/sample_abc123',
    description: 'ID público   ',
  })
  publicId: string;

  @ApiPropertyOptional({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización asociada',
  })
  organizationalId?: string;
}

export class UploadExcursionImageResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión subida exitosamente' })
  message: string;

  @ApiProperty({ type: ExcursionImageResponseDto })
  data: ExcursionImageResponseDto;
}

export class DeleteExcursionImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión eliminada exitosamente' })
  message: string;
}

export class ReplaceExcursionImageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Imagen de excursión reemplazada exitosamente' })
  message: string;

  @ApiProperty({ type: ExcursionImageResponseDto })
  data: ExcursionImageResponseDto;
}

export class GetExcursionImagesResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    type: [ExcursionImageResponseDto],
    description: 'Lista de imágenes de la excursión',
  })
  data: ExcursionImageResponseDto[];
}

export class ExcursionImageParamsDto {
  @ApiProperty({ example: 1, description: 'ID de la excursión' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  excursionId: number;

  @ApiPropertyOptional({
    example: 'excursions/sample_abc123',
    description: 'Public ID de la imagen ',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  publicId?: string;

  @ApiPropertyOptional({
    example: 'uuid-de-organizacion',
    description: 'ID de la organización',
  })
  @IsOptional()
  @IsString()
  organizationalId?: string;
}
