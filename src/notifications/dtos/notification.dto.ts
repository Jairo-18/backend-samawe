import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ParamsPaginationDto } from '../../shared/dtos/pagination.dto';

export class PaginatedNotificationParamsDto extends ParamsPaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código de estado (ej: ENC, ENT)',
    example: 'ENC',
  })
  @IsOptional()
  @IsString()
  stateCode?: string;
}
