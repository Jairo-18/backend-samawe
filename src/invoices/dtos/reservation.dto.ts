import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RESERVATION_MAX_GUESTS_INPUT } from '../constants/reservation.constants';

/**
 * Lo único que manda el huésped. El cliente sale del token y el precio, los
 * impuestos y el estado los calcula el servidor: nada de eso se acepta aquí.
 */
export class CreateReservationDto {
  @ApiProperty({ example: 6, description: 'ID del hospedaje' })
  @IsInt()
  @Min(1)
  accommodationId: number;

  @ApiProperty({ example: '2026-10-12', description: 'Día de entrada' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de entrada debe tener formato AAAA-MM-DD',
  })
  startDate: string;

  @ApiProperty({ example: '2026-10-14', description: 'Día de salida' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de salida debe tener formato AAAA-MM-DD',
  })
  endDate: string;

  @ApiProperty({ example: 2, description: 'Número de huéspedes' })
  @IsInt()
  @Min(1)
  @Max(RESERVATION_MAX_GUESTS_INPUT)
  guests: number;

  @ApiPropertyOptional({ example: '16:30', description: 'Hora estimada de llegada' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de llegada debe tener formato HH:mm',
  })
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Notas o peticiones especiales' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
