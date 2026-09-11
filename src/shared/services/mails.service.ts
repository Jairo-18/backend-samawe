import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailOptions } from '../interfaces/mail.interface';

@Injectable()
export class MailsService {
  private readonly logger = new Logger(MailsService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail({
    from,
    to,
    subject,
    body,
    attachments,
  }: SendEmailOptions): Promise<void> {
    const recipient = to || this.configService.get<string>('mail.to');
    if (!recipient) {
      throw new HttpException(
        'No recipient email provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { to: finalTo, subject: finalSubject } = this.applyEnvironmentGuard(
      recipient,
      subject,
    );

    return await this.mailerService.sendMail({
      from: from || this.configService.get<string>('mail.sender'),
      to: finalTo,
      subject: finalSubject,
      html: body,
      ...(attachments?.length ? { attachments } : {}),
    });
  }

  /**
   * Fuera de producción, ningún correo sale a su destinatario real.
   *
   * Los entornos de desarrollo usan el MISMO SMTP que producción (la cuenta de
   * Gmail del hotel) y suelen trabajar sobre una copia de la base de producción,
   * o sea con correos de clientes reales. Sin esto, probar una emisión en dev le
   * manda al cliente una factura de sandbox —prefijo SETP, sin validez ante la
   * DIAN— desde la cuenta oficial del negocio.
   *
   * El correo igual se envía (así se puede verificar plantilla y adjuntos), pero
   * al buzón del propio negocio y con el destinatario original en el asunto.
   */
  private applyEnvironmentGuard(
    to: string,
    subject: string,
  ): { to: string; subject: string } {
    const env = this.configService.get<string>('app.env');
    if (env === 'production') {
      return { to, subject };
    }

    const fallback =
      this.configService.get<string>('mail.redirectTo') ||
      this.configService.get<string>('mail.user') ||
      '';

    if (!fallback) {
      // Sin buzón al que desviar, es preferible no enviar nada antes que
      // alcanzar a un cliente real desde un entorno de pruebas.
      this.logger.warn(
        `[${env}] Correo a "${to}" descartado: no hay MAIL_REDIRECT_TO ni ` +
          'MAIL_USER configurados para desviarlo.',
      );
      throw new HttpException(
        'Envío de correo bloqueado fuera de producción: configure MAIL_REDIRECT_TO.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.log(
      `[${env}] Correo redirigido: "${to}" → "${fallback}" (asunto: ${subject}).`,
    );
    return {
      to: fallback,
      subject: `[${String(env).toUpperCase()} · para ${to}] ${subject}`,
    };
  }
}
