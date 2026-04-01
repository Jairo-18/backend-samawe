import { Injectable } from '@nestjs/common';

@Injectable()
export class MailTemplateService {
  recoveryPasswordTemplate(
    resetLink: string,
    fistName: string,
    lastName: string,
    resetToken: string,
    organizationName: string = 'Eco Hotel Samawé',
    primaryColor: string = '#486E2B',
    logoUrl: string = '',
  ) {
    const brandColor = primaryColor || '#486E2B';
    const orgName = organizationName || 'Eco Hotel Samawé';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${orgName} Logo" style="max-height: 50px; display: block; margin: 0 auto; margin-bottom: 20px;">`
      : `<h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">${orgName}</h2>`;

    const template = `
      <div style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Inter', 'Roboto', 'Helvetica', Arial, sans-serif; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <!-- Header Accent Bar -->
                <tr>
                  <td style="background-color: ${brandColor}; height: 6px;"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Branding placeholder or Welcome -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      ${logoHtml}
                      <h2 style="color: #111827; margin: 0; font-size: 20px; font-weight: 600; margin-top: 15px;">Recuperar Contraseña</h2>
                    </div>

                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 20px;">
                      ¡Hola <strong>${fistName || ''} ${lastName || ''}</strong>!
                    </p>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 25px;">
                      Hemos recibido una solicitud para restablecer tu contraseña en <strong>${orgName}</strong>. Si fuiste tú, haz clic en el botón de abajo para continuar.
                    </p>
                    
                    <!-- Action Button -->
                    <div style="text-align: center; margin-top: 35px; margin-bottom: 35px;">
                      <a href="${resetLink}?token=${resetToken}" 
                          style="background-color: ${brandColor}; 
                                color: #ffffff; 
                                padding: 14px 34px; 
                                text-decoration: none; 
                                border-radius: 10px;
                                font-weight: 600;
                                font-size: 16px;
                                display: inline-block;
                                transition: background-color 0.2s ease;">
                        Restablecer Contraseña
                      </a>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 10px;">
                      <p style="color: #9ca3af; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
                        Este enlace expirará pronto. Si no solicitaste este cambio, simplemente ignora este mensaje. Tus datos están seguros.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding-bottom: 30px; padding-left: 30px; padding-right: 30px; text-align: center;">
                    <p style="color: #D1D5DB; margin: 0; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 500;">
                      © ${new Date().getFullYear()} ${orgName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
    return template;
  }
}
