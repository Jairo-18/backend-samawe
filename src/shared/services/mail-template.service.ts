import { Injectable } from '@nestjs/common';

@Injectable()
export class MailTemplateService {
  recoveryPasswordTemplate(
    resetLink: string,
    fistName: string,
    resetToken: string,
  ) {
    const template = `
          
              <div style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
              <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; margin-top: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <!-- Encabezado -->
                <tr>
                  <td style="background-color: #60a5fa; padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Recuperación de Contraseña</h1>
                  </td>
                </tr>
                
                <!-- Contenido -->
                <tr>
                  <td style="padding: 40px 20px;">
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                      ¡Hola ${fistName || ''}! Hemos recibido una solicitud para restablecer tu contraseña.
                    </p>
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                      Si no realizaste esta solicitud, puedes ignorar este correo. De lo contrario, haz clic en el botón de abajo para continuar con el proceso.
                    </p>
                    
                    <!-- Botón -->
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
                      <a href="${resetLink}?token=${resetToken}" 
                         style="background-color: #60a5fa; 
                                color: white; 
                                padding: 12px 30px; 
                                text-decoration: none; 
                                border-radius: 5px;
                                font-weight: bold;
                                display: inline-block;
                                transition: background-color 0.3s ease;">
                        Recuperar Contraseña
                      </a>
                    </div>
                    
                  </td>
                </tr>
                
                <!-- Pie -->
                <tr>
                  <td style="background-color: #60a5fa; padding: 20px; text-align: center;">
                    <p style="color: white; margin: 0; font-size: 14px;">
                      © ${new Date().getFullYear()} Samawe. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </div>

        `;
    return template;
  }
}
