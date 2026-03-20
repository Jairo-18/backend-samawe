import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../entities/push-subscription.entity';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PushSubscription)
    private readonly pushSubRepo: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@ecohotelsamawe.com',
    );

    if (!publicKey || !privateKey) {
      this.logger.error(
        'VAPID keys not found in environment. Web Push is disabled.',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('Web Push initialized with VAPID keys.');
  }

  getVapidPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY', '');
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const existing = await this.pushSubRepo.findOne({
      where: { user: { userId }, endpoint: subscription.endpoint },
    });

    if (existing) {
      // Actualizar keys si cambiaron
      existing.p256dh = subscription.keys.p256dh;
      existing.auth = subscription.keys.auth;
      await this.pushSubRepo.save(existing);
      this.logger.log(
        `[WebPush] Suscripción actualizada para userId: ${userId}`,
      );
      return;
    }

    const entity = this.pushSubRepo.create({
      user: { userId } as any,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    await this.pushSubRepo.save(entity);
    this.logger.log(
      `[WebPush] Nueva suscripción guardada para userId: ${userId}`,
    );
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.pushSubRepo.delete({ user: { userId }, endpoint });
    this.logger.log(`[WebPush] Suscripción eliminada para userId: ${userId}`);
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<void> {
    const subscriptions = await this.pushSubRepo.find({
      where: { user: { userId } },
    });

    if (!subscriptions.length) return;

    const payloadStr = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr,
        ),
      ),
    );

    // Eliminar suscripciones inválidas (410 Gone = usuario la revocó)
    const toDelete: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as any;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          toDelete.push(subscriptions[i].id);
          this.logger.warn(
            `[WebPush] Suscripción inválida eliminada: ${subscriptions[i].endpoint}`,
          );
        } else {
          this.logger.error(`[WebPush] Error al enviar push:`, err?.message);
        }
      }
    });

    if (toDelete.length) {
      await this.pushSubRepo.delete(toDelete);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(
      `[WebPush] Push enviado a ${sent}/${subscriptions.length} dispositivos de userId: ${userId}`,
    );
  }

  async sendToAllUsers(
    userIds: string[],
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, payload)),
    );
  }
}
