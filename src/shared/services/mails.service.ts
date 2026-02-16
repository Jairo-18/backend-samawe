import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailsService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail({
    from,
    to,
    subject,
    body,
  }: {
    from?: string;
    to?: string;
    subject: string;
    body: string;
  }): Promise<void> {
    if (!to && !this.configService.get<string>('mail.to')) {
      throw new HttpException(
        'No recipient email provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.mailerService.sendMail({
      from: from || this.configService.get<string>('mail.sender'),
      to: to || this.configService.get<string>('mail.to'),
      subject,
      html: body,
    });
  }
}
