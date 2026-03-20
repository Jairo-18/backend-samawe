import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebPushService } from '../services/web-push.service';

class PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications/push')
export class PushSubscriptionController {
  constructor(private readonly _webPushService: WebPushService) {}

  @Get('vapid-key')
  @ApiOperation({
    summary: 'Obtener la VAPID public key para suscripciones push',
  })
  getVapidKey() {
    return {
      statusCode: 200,
      data: { publicKey: this._webPushService.getVapidPublicKey() },
    };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Registrar suscripción push del dispositivo' })
  async subscribe(@Request() req, @Body() body: PushSubscriptionDto) {
    const userId = req.user.userId;
    await this._webPushService.saveSubscription(userId, body);
    return {
      statusCode: 201,
      message: 'Suscripción registrada correctamente',
    };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Eliminar suscripción push del dispositivo' })
  async unsubscribe(@Request() req, @Body() body: { endpoint: string }) {
    const userId = req.user.userId;
    await this._webPushService.removeSubscription(userId, body.endpoint);
    return {
      statusCode: 200,
      message: 'Suscripción eliminada',
    };
  }
}
