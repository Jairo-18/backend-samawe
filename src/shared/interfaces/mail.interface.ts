/** Adjunto de correo en formato nodemailer (PDF, QR inline vía cid, etc.). */
export interface MailAttachment {
  filename?: string;
  content?: Buffer | string;
  contentType?: string;
  cid?: string;
  encoding?: string;
}

/** Parámetros de MailsService.sendEmail. */
export interface SendEmailOptions {
  from?: string;
  to?: string;
  subject: string;
  body: string;
  attachments?: MailAttachment[];
}
