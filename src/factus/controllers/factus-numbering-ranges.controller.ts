import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusBillsService } from '../services/factus-bills.service';
import { FactusNumberingService } from '../services/factus-numbering.service';

class UpdateRangeSelectionDto {
  // `null` es un valor válido y significativo: vuelve al modo automático.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  sales?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  creditNote?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  supportDocument?: number | null;
}

/**
 * Numeración DIAN, en vivo desde Factus. Es la pantalla que le dice al contador
 * en qué consecutivo va cada documento y cuánta vigencia le queda a cada
 * resolución, y donde un SUPERADMIN fija qué rango usa cada tipo.
 *
 * Los datos del rango son de solo lectura a propósito: el consecutivo lo lleva
 * Factus. Lo único que se guarda aquí es la elección.
 */
@ApiTags('Factus - Numbering Ranges')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Controller('factus/numbering-ranges')
export class FactusNumberingRangesController {
  constructor(
    private readonly billsService: FactusBillsService,
    private readonly numberingService: FactusNumberingService,
  ) {}

  @Get()
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary:
      'Rangos de numeración DIAN con consecutivo actual, semáforo de vencimiento y rango elegido por documento',
  })
  async list(@Query('organizationalId') organizationalId?: string) {
    const data = await this.numberingService.getOverview(organizationalId);
    return { success: true, data };
  }

  @Patch('selection')
  @Roles(RolesUser.SUPERADMIN)
  @ApiOperation({
    summary: 'Fijar qué rango de numeración usa cada documento (null = automático)',
  })
  async updateSelection(
    @Body() body: UpdateRangeSelectionDto,
    @Query('organizationalId') organizationalId?: string,
  ) {
    const data = await this.numberingService.updateSelection(
      body,
      organizationalId,
    );
    return { success: true, data };
  }

  /**
   * Los rangos se cachean 10 minutos. Tras crear o activar un rango en el
   * portal de Factus, esto evita esperar a que el cache expire (antes había que
   * reiniciar el backend, justo el día en que la facturación está caída).
   */
  @Post('refresh')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({ summary: 'Invalidar el cache y releer los rangos de Factus' })
  async refresh(@Query('organizationalId') organizationalId?: string) {
    this.billsService.invalidateRangesCache();
    const data = await this.numberingService.getOverview(organizationalId);
    return { success: true, data };
  }
}
