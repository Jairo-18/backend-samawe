/**
 * Comprueba que fuera de producción ningún correo sale a su destinatario real.
 * No envía nada: sustituye el MailerService por un espía.
 *
 * Ejecutar: npx ts-node scripts/check-mail-guard.ts
 */
import { MailsService } from '../src/shared/services/mails.service';

type Case = {
  nombre: string;
  env: string;
  redirectTo?: string;
  user?: string;
  esperado: 'entrega' | 'redirige' | 'bloquea';
};

const CASES: Case[] = [
  {
    nombre: 'producción entrega al cliente real',
    env: 'production',
    user: 'samaweputumayo@gmail.com',
    esperado: 'entrega',
  },
  {
    nombre: 'development redirige al buzón configurado',
    env: 'development',
    redirectTo: 'pruebas@samawe.com',
    user: 'samaweputumayo@gmail.com',
    esperado: 'redirige',
  },
  {
    nombre: 'development sin MAIL_REDIRECT_TO cae en MAIL_USER',
    env: 'development',
    user: 'samaweputumayo@gmail.com',
    esperado: 'redirige',
  },
  {
    nombre: 'development sin buzón alguno: bloquea en vez de entregar',
    env: 'development',
    esperado: 'bloquea',
  },
];

const CLIENTE_REAL = 'cliente.real@gmail.com';
let fallos = 0;

(async () => {
  for (const c of CASES) {
    const enviados: { to: string; subject: string }[] = [];
    const mailer = {
      sendMail: async (opts: any) => {
        enviados.push({ to: opts.to, subject: opts.subject });
      },
    } as any;
    const config = {
      get: (key: string) =>
        ({
          'app.env': c.env,
          'mail.redirectTo': c.redirectTo ?? '',
          'mail.user': c.user ?? '',
          'mail.sender': 'Samawe <no-reply@samawe.com>',
          'mail.to': '',
        })[key],
    } as any;

    const service = new MailsService(mailer, config);
    let bloqueado = false;
    try {
      await service.sendEmail({
        to: CLIENTE_REAL,
        subject: 'Factura A849',
        body: '<p>x</p>',
      } as any);
    } catch {
      bloqueado = true;
    }

    const enviado = enviados[0];
    let real: Case['esperado'];
    if (bloqueado) real = 'bloquea';
    else if (enviado?.to === CLIENTE_REAL) real = 'entrega';
    else real = 'redirige';

    const ok = real === c.esperado;
    if (!ok) fallos++;
    console.log(
      `${ok ? 'OK  ' : 'FALLA'} ${c.nombre}\n      → ${real}` +
        (enviado ? ` | to="${enviado.to}" | subject="${enviado.subject}"` : ''),
    );

    // Lo crítico: fuera de producción el correo del cliente NUNCA es el destino.
    if (c.env !== 'production' && enviado?.to === CLIENTE_REAL) {
      console.log('      ⚠️ FUGA: alcanzó al cliente real desde un entorno de pruebas');
      fallos++;
    }
  }

  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
