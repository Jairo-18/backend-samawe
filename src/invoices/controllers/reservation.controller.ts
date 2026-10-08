import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { CreateReservationDto } from '../dtos/reservation.dto';
import { ReservationService } from '../services/reservation.service';

const STAFF_ROLES = [RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP];

/**
 * Reservas de estadía hechas por el huésped.
 *
 * `reservations` va como POST y no choca con `invoices/:id`, que solo existe
 * para GET y DELETE.
 */
@Controller('invoices')
@ApiTags('Facturas - Reservas en línea')
@UseGuards(AuthGuard(), RolesGuard)
export class ReservationController {
  constructor(private readonly _reservationService: ReservationService) {}

  @Post('reservations')
  @Roles(RolesUser.USER)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'El huésped reserva una estadía (queda retenida hasta confirmar el pago)',
  })
  async create(@Body() dto: CreateReservationDto, @Request() req: any) {
    // El cliente es SIEMPRE el del token; el DTO no lleva userId.
    const data = await this._reservationService.create(req.user.userId, dto);
    return {
      statusCode: HttpStatus.CREATED,
      title: 'api.invoice.created_title',
      message: 'api.invoice.created',
      data,
    };
  }

  @Post(':invoiceId/reservation/confirm-payment')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Confirma el pago de una reserva (RES → RES2)' })
  async confirmPayment(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return {
      statusCode: HttpStatus.OK,
      data: await this._reservationService.confirmPayment(invoiceId),
    };
  }

  @Post(':invoiceId/reservation/extend')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Extiende la retención de una reserva sin pagar' })
  async extend(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return {
      statusCode: HttpStatus.OK,
      data: await this._reservationService.extendHold(invoiceId),
    };
  }
}
