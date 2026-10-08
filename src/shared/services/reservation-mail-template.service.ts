import { Injectable } from '@nestjs/common';
import { Organizational } from '../entities/organizational.entity';

export type ReservationMailStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ReservationMailData {
  guestName: string;
  code: string;
  accommodationName: string;
  /** `YYYY-MM-DD` */
  startDate: string;
  endDate: string;
  nights?: number;
  guests?: number;
  total?: number;
  arrivalTime?: string;
  /** ISO. Solo para "en espera": hasta cuándo se retienen las fechas. */
  expiresAt?: string;
  detailUrl?: string;
}

/**
 * Correos al huésped sobre el estado de su reserva en línea: en espera (al
 * pedirla), aprobada, no aceptada o vencida sin pago. Misma estructura visual
 * que `MailTemplateService` (barra de marca, tarjeta, botón).
 */
@Injectable()
export class ReservationMailTemplateService {
  subject(status: ReservationMailStatus, code: string): string {
    return {
      PENDING: `Recibimos tu solicitud de reserva #${code}`,
      APPROVED: `¡Tu estadía fue aprobada! Reserva #${code}`,
      REJECTED: `Tu reserva #${code} no fue aceptada`,
      CANCELLED: `Tu reserva #${code} fue cancelada`,
      EXPIRED: `Tu reserva #${code} venció`,
    }[status];
  }

  build(
    status: ReservationMailStatus,
    d: ReservationMailData,
    org: Organizational | null,
  ): string {
    const brandColor = org?.primaryColor ?? '#486E2B';
    const bgColor = org?.bgSecondaryColor ?? '#f9fafb';
    const titleTextColor = org?.titleColor ?? '#111827';
    const bodyTextColor = org?.textColor ?? '#4b5563';
    const orgName = escapeHtml(org?.name ?? 'Eco Hotel Samawé');
    const logoUrl =
      org?.medias?.find((m) => m.mediaType?.code === 'LOGO')?.url ?? '';
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 50px; display: block; margin: 0 auto; margin-bottom: 20px; border-radius: 100%; object-fit: cover;">`
      : `<h2 style="color: ${titleTextColor}; margin: 0; font-size: 24px; font-weight: 700;">${orgName}</h2>`;

    const guest = escapeHtml(d.guestName || '');
    const copy = {
      PENDING: {
        badge: 'EN ESPERA',
        color: '#b45309',
        bg: '#fffbeb',
        title: 'Hemos recibido tu solicitud',
        intro: `Has pedido una reservación en <strong>${orgName}</strong>. Está <strong>en espera de aprobación</strong>: te escribiremos apenas la revisemos.`,
        note: d.expiresAt
          ? `Retenemos tus fechas hasta el <strong>${formatDateTime(d.expiresAt)}</strong>. Realiza el pago y envíanos el comprobante; si no lo recibimos a tiempo, las fechas se liberan.`
          : 'Realiza el pago y envíanos el comprobante para confirmar tus fechas.',
      },
      APPROVED: {
        badge: 'APROBADA',
        color: '#15803d',
        bg: '#f0fdf4',
        title: '¡Tu estadía fue aprobada!',
        intro: `Tu reserva en <strong>${orgName}</strong> quedó <strong>confirmada</strong>. ¡Te esperamos!`,
        note: 'Si necesitas cambiar algo, escríbenos con tu número de reserva.',
      },
      REJECTED: {
        badge: 'NO ACEPTADA',
        color: '#b91c1c',
        bg: '#fef2f2',
        title: 'Tu reserva no fue aceptada',
        intro: `Lamentamos informarte que tu solicitud en <strong>${orgName}</strong> <strong>no pudo ser aceptada</strong>.`,
        note: 'Las fechas quedaron libres. Si tienes dudas o quieres otras fechas, escríbenos y con gusto te ayudamos.',
      },
      CANCELLED: {
        badge: 'CANCELADA',
        color: '#b91c1c',
        bg: '#fef2f2',
        title: 'Tu reserva fue cancelada',
        intro: `Tu reserva en <strong>${orgName}</strong> <strong>fue cancelada</strong> y las fechas quedaron libres.`,
        note: 'Si no esperabas este cambio o tienes dudas, escríbenos y con gusto te ayudamos.',
      },
      EXPIRED: {
        badge: 'VENCIDA',
        color: '#b91c1c',
        bg: '#fef2f2',
        title: 'Tu reserva venció',
        intro: `Tu solicitud en <strong>${orgName}</strong> <strong>venció sin recibir el pago</strong> y las fechas volvieron a quedar disponibles.`,
        note: 'Puedes volver a reservar cuando quieras desde nuestra página.',
      },
    }[status];

    const rows: Array<[string, string]> = [
      ['Reserva', `#${escapeHtml(d.code)}`],
      ['Alojamiento', escapeHtml(d.accommodationName || '')],
      ['Llegada', formatDay(d.startDate)],
      ['Salida', formatDay(d.endDate)],
    ];
    if (d.nights) rows.push(['Noches', String(d.nights)]);
    if (d.guests) rows.push(['Huéspedes', String(d.guests)]);
    if (d.arrivalTime) {
      rows.push(['Llegada estimada', formatTime(d.arrivalTime)]);
    }
    if (d.total != null) rows.push(['Total', `COP ${formatMoney(d.total)}`]);

    const rowsHtml = rows
      .map(
        ([k, v]) => `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${k}</td>
            <td style="padding: 8px 0; color: ${titleTextColor}; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #f3f4f6;">${v}</td>
          </tr>`,
      )
      .join('');

    const button = d.detailUrl
      ? `<div style="text-align: center; margin: 30px 0 10px;">
           <a href="${d.detailUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px; display: inline-block;">Ver mi reserva</a>
         </div>`
      : '';

    return `
      <style>@import url('https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@400;500;700&family=Poppins:wght@300;400;500;600&display=swap');</style>
      <div style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: 'Poppins', 'Helvetica', Arial, sans-serif; width: 100%;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${bgColor}; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background: white; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
                <tr><td style="background-color: ${brandColor}; height: 6px;"></td></tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      ${logoHtml}
                      <span style="display: inline-block; margin-top: 14px; padding: 4px 14px; border-radius: 999px; background: ${copy.bg}; color: ${copy.color}; font-size: 11px; font-weight: 700; letter-spacing: 1.5px;">${copy.badge}</span>
                      <h2 style="color: ${titleTextColor}; margin: 12px 0 0; font-size: 22px; font-weight: 600; font-family: 'Alegreya SC', Georgia, serif;">${copy.title}</h2>
                    </div>
                    <p style="color: ${bodyTextColor}; font-size: 16px; line-height: 24px; margin: 0 0 14px;">¡Hola <strong>${guest}</strong>!</p>
                    <p style="color: ${bodyTextColor}; font-size: 16px; line-height: 24px; margin: 0 0 22px;">${copy.intro}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">${rowsHtml}</table>
                    ${button}
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
                      <p style="color: #6b7280; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">${copy.note}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 30px; padding-left: 30px; padding-right: 30px; text-align: center;">
                    <p style="color: #D1D5DB; margin: 0; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 500;">© ${new Date().getFullYear()} ${orgName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDay(value: string): string {
  const [y, m, day] = (value ?? '').split('-').map(Number);
  if (!y || !m || !day) return escapeHtml(value ?? '');
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** `13:30` → `1:30 p. m.` (el dato viaja en 24 h; al huésped se le muestra en 12 h). */
function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return escapeHtml(value ?? '');
  const h = Number(match[1]);
  if (h > 23) return escapeHtml(value);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  return `${h % 12 || 12}:${match[2]} ${suffix}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(value: number): string {
  return Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}
