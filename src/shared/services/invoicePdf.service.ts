/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import sharp from 'sharp';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceDetaill } from '../entities/invoiceDetaill.entity';
import { Organizational } from '../entities/organizational.entity';
import { OrganizationalMedia } from '../entities/organizationalMedia.entity';

// pdfmake 0.3.x expone en node una instancia singleton (require('pdfmake')).
// @types/pdfmake no la tipa, así que la cargamos vía require como any.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake') as any;
// Carpeta con las fuentes Roboto .ttf que trae el propio paquete pdfmake.
// En 0.3.x las fuentes deben referenciarse por ruta de archivo (no Buffer).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ROBOTO_DIR = path.join(
  path.dirname(require.resolve('pdfmake/package.json')),
  'build',
  'fonts',
  'Roboto',
);

const DEFAULT_COLOR = '#486e2b';

function getColor(org?: Organizational | null): string {
  return org?.primaryColor || DEFAULT_COLOR;
}

function formatCop(value: string | number): string {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
  return `${formatted} COP`;
}

// Descarga una imagen (logo) y la devuelve como data URI PNG. pdfmake/pdfkit
// solo soporta PNG/JPEG, así que normalizamos cualquier formato (el logo de la
// org es WebP) a PNG con sharp. Best-effort: si falla (red/404/formato) devuelve
// null y el PDF usa el texto de respaldo.
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const png = await sharp(input).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'CERO PESOS';
  const b1 = [
    '',
    'UN',
    'DOS',
    'TRES',
    'CUATRO',
    'CINCO',
    'SEIS',
    'SIETE',
    'OCHO',
    'NUEVE',
    'DIEZ',
    'ONCE',
    'DOCE',
    'TRECE',
    'CATORCE',
    'QUINCE',
    'DIECISÉIS',
    'DIECISIETE',
    'DIECIOCHO',
    'DIECINUEVE',
    'VEINTE',
    'VEINTIÚN',
    'VEINTIDÓS',
    'VEINTITRÉS',
    'VEINTICUATRO',
    'VEINTICINCO',
    'VEINTISÉIS',
    'VEINTISIETE',
    'VEINTIOCHO',
    'VEINTINUEVE',
  ];
  const b2 = [
    '',
    '',
    'VEINTE',
    'TREINTA',
    'CUARENTA',
    'CINCUENTA',
    'SESENTA',
    'SETENTA',
    'OCHENTA',
    'NOVENTA',
  ];
  const b3 = [
    '',
    'CIENTO',
    'DOSCIENTOS',
    'TRESCIENTOS',
    'CUATROCIENTOS',
    'QUINIENTOS',
    'SEISCIENTOS',
    'SETECIENTOS',
    'OCHOCIENTOS',
    'NOVECIENTOS',
  ];

  function chunk(c: number): string {
    if (c === 0) return '';
    if (c === 100) return 'CIEN';
    const h = Math.floor(c / 100);
    const rem = c % 100;
    let s = h ? b3[h] + (rem ? ' ' : '') : '';
    if (rem > 0 && rem < 30) s += b1[rem];
    else if (rem >= 30) {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      s += b2[t] + (u ? ' Y ' + b1[u] : '');
    }
    return s.trim();
  }

  const mill = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  let res = '';
  if (mill > 0)
    res += (mill === 1 ? 'UN MILLÓN' : chunk(mill) + ' MILLONES') + ' ';
  if (miles > 0) res += (miles === 1 ? 'MIL' : chunk(miles) + ' MIL') + ' ';
  if (resto > 0) res += chunk(resto);
  return res.trim() + ' PESOS';
}

function tField(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const obj = v as Record<string, string>;
  return obj['es'] || obj['en'] || Object.values(obj)[0] || '';
}

// Extrae un idioma concreto de un TranslatedField ({ es, en }). Se usa para el
// título bilingüe de la factura (igual que el generador del frontend).
function tFieldLang(v: unknown, lang: 'es' | 'en'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const obj = v as Record<string, string>;
  return obj[lang] || '';
}

function itemCargo(d: InvoiceDetaill): number {
  return Number(d.priceWithTax || 0) * Number(d.amount || 0);
}
function itemRef(d: InvoiceDetaill): string {
  return d.product?.code || d.accommodation?.code || d.excursion?.code || '-';
}
function itemConcept(d: InvoiceDetaill): string {
  return (
    tField(d.product?.name) ||
    tField(d.accommodation?.name) ||
    tField(d.excursion?.name) ||
    'N/A'
  );
}

async function buildInvoiceDoc(
  invoice: Invoice,
  org?: Organizational | null,
): Promise<Record<string, unknown>> {
  const color = getColor(org);

  const logoMedia = (org?.medias || []).find(
    (m: OrganizationalMedia) => m.mediaType?.code === 'LOGO',
  );
  const logoBase64 = logoMedia?.url
    ? await imageUrlToBase64(logoMedia.url)
    : null;

  // factusQrCode = URL oficial de validación DIAN (el contenido del QR). pdfMake
  // genera el QR nativamente con { qr }.
  const qrContent = invoice.factusQrCode || invoice.factusPublicUrl || '';

  const printDate = new Date().toLocaleString('es-CO');
  const hs = {
    bold: true,
    color: '#fff',
    fontSize: 7,
    fillColor: color,
    alignment: 'center' as const,
  };

  // Cada línea: unidad (cantidad), valor unitario (sin impuestos), IVA, IPO
  // (Impuesto al Consumo) y total de la línea (con impuestos).
  const itemRows = (invoice.invoiceDetails || [])
    .filter((d: InvoiceDetaill) => !d.deletedAt)
    .map((d: InvoiceDetaill, i: number) => {
      const unidad = Number(d.amount || 0);
      const valorUnitario = Number(d.priceWithoutTax || 0);
      const iva = Number(d.totalVat || 0);
      const ipo = Number(d.totalIco8 || 0) + Number(d.totalIco5 || 0);
      const totalLinea = itemCargo(d);
      return [
        { text: String(i + 1), fontSize: 6.5, alignment: 'center' as const },
        { text: itemRef(d), fontSize: 6.5, alignment: 'center' as const },
        { text: itemConcept(d), fontSize: 6 },
        {
          text: String(Number(unidad.toFixed(2))),
          fontSize: 6.5,
          alignment: 'center' as const,
        },
        {
          text: formatCop(valorUnitario),
          fontSize: 6.5,
          alignment: 'right' as const,
        },
        { text: formatCop(iva), fontSize: 6.5, alignment: 'right' as const },
        { text: formatCop(ipo), fontSize: 6.5, alignment: 'right' as const },
        {
          text: formatCop(totalLinea),
          fontSize: 6.5,
          alignment: 'right' as const,
        },
      ];
    });

  const total = Number(invoice.total || 0);

  const clientName =
    `${invoice.user?.firstName || ''} ${invoice.user?.lastName || ''}`.trim();
  const clientId = invoice.user?.identificationNumber || '';
  const clientIdType = invoice.user?.identificationType?.code || '';
  const clientAddress = invoice.user?.address || '';
  const clientDept = invoice.user?.department?.name || '';
  const clientMuni = invoice.user?.municipality?.name || '';
  const clientEmail = invoice.user?.email || '';
  const employeeName =
    `${invoice.employee?.firstName || ''} ${invoice.employee?.lastName || ''}`.trim();
  const subtotalWithoutTax = Number(invoice.subtotalWithoutTax || 0);
  const totalVat = Number(invoice.totalVat || 0);
  const totalIco =
    Number(invoice.totalIco8 || 0) + Number(invoice.totalIco5 || 0);

  const minRows = 8;
  const emptyRowCount = Math.max(0, minRows - itemRows.length);
  const emptyRows = Array(emptyRowCount)
    .fill(null)
    .map(() => Array(8).fill({ text: ' ', fontSize: 7 }));

  const content: any[] = [
    {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 75, height: 75, margin: [0, 0, 8, 0] }
          : { width: 75, text: org?.legalName || '', bold: true, fontSize: 10 },
        {
          width: '*',
          stack: [
            {
              text: (org?.legalName || org?.name || '').toUpperCase(),
              bold: true,
              fontSize: 12,
              alignment: 'center' as const,
            },
            {
              text: `${org?.identificationType?.code || 'NIT'} ${org?.identificationNumber || ''}`,
              fontSize: 9,
              alignment: 'center' as const,
            },
            {
              text: org?.address || '',
              fontSize: 8,
              alignment: 'center' as const,
            },
            {
              text: [org?.city, org?.department].filter(Boolean).join(', '),
              fontSize: 8,
              alignment: 'center' as const,
            },
            {
              text: org?.email || '',
              fontSize: 8,
              alignment: 'center' as const,
            },
            {
              text: org?.phone ? `Tel. ${org.phone}` : '',
              fontSize: 8,
              alignment: 'center' as const,
            },
          ],
        },
        {
          width: 100,
          stack: qrContent
            ? [{ qr: qrContent, fit: 100 }]
            : [
                {
                  canvas: [
                    {
                      type: 'rect' as const,
                      x: 0,
                      y: 0,
                      w: 100,
                      h: 100,
                      lineWidth: 1,
                      lineColor: '#cccccc',
                      dash: { length: 3 },
                    },
                  ],
                },
                {
                  text: 'QR',
                  fontSize: 7,
                  color: '#aaaaaa',
                  alignment: 'center' as const,
                  margin: [0, -58, 0, 0],
                },
              ],
          margin: [8, 0, 0, 0],
        },
      ],
      marginBottom: 5,
    },
    {
      canvas: [
        {
          type: 'line' as const,
          x1: 0,
          y1: 0,
          x2: 576,
          y2: 0,
          lineWidth: 1.5,
          lineColor: color,
        },
      ],
      marginBottom: 4,
    },
    {
      columns: [
        {
          width: 135,
          table: {
            widths: ['*'],
            body: [
              [
                {
                  // El nombre del tipo de factura ya viene completo (FVE =
                  // "Factura de Venta Electrónica"); se muestra bilingüe tal cual,
                  // igual que el PDF de descarga del frontend.
                  text: `${(tFieldLang(invoice.invoiceType?.name, 'es') || 'FACTURA DE VENTA').toUpperCase()}\n${(tFieldLang(invoice.invoiceType?.name, 'en') || 'SALES INVOICE').toUpperCase()}`,
                  bold: true,
                  fontSize: 9,
                  alignment: 'center' as const,
                  color,
                  margin: [4, 3, 4, 2],
                },
              ],
              [
                {
                  text: `No. ${invoice.invoiceType?.code || ''} ${invoice.code}`,
                  bold: true,
                  fontSize: 11,
                  alignment: 'center' as const,
                  margin: [4, 1, 4, 1],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
          },
        },
        {
          width: '*',
          stack: [
            {
              text: 'RESPONSABLE DEL IVA / VAT Liable',
              bold: true,
              fontSize: 11,
              alignment: 'center' as const,
            },
            {
              text: 'Microempresa / Micro-enterprise',
              fontSize: 8,
              italics: true,
              alignment: 'center' as const,
              color: '#555555',
            },
            {
              text: `Generado por / Issued by: ${org?.legalName || ''}`,
              fontSize: 8,
              alignment: 'center' as const,
              marginTop: 2,
            },
            {
              text: `Fecha de impresión / Print date: ${printDate}`,
              fontSize: 8,
              alignment: 'center' as const,
            },
          ],
          margin: [8, 2, 0, 0],
        },
      ],
      columnGap: 8,
      marginBottom: 5,
    },
    {
      table: {
        widths: ['*', '*', 55],
        body: [
          [
            {
              text: 'FACTURA GENERADA POR / Issued by',
              bold: true,
              fontSize: 7,
              fillColor: color,
              color: '#fff',
              margin: [3, 2, 3, 2],
            },
            {
              text: 'FACTURADO A (pagador) / Bill to (Payor)',
              bold: true,
              fontSize: 7,
              fillColor: color,
              color: '#fff',
              margin: [3, 2, 3, 2],
            },
            {
              text: 'Página 1 de 1',
              bold: true,
              fontSize: 7,
              fillColor: color,
              color: '#fff',
              alignment: 'center' as const,
              margin: [2, 2, 2, 2],
            },
          ],
          [
            {
              stack: [{ text: employeeName || '-', bold: true, fontSize: 9 }],
              margin: [3, 3, 3, 3],
            },
            {
              stack: [
                {
                  text: [
                    { text: 'Nombre / Name: ', bold: true },
                    clientName || '-',
                  ],
                  fontSize: 8,
                },
                clientIdType || clientId
                  ? {
                      text: [
                        { text: 'Documento / ID: ', bold: true },
                        `${clientIdType ? clientIdType + ' ' : ''}${clientId}`.trim(),
                      ],
                      fontSize: 8,
                    }
                  : {},
                clientDept
                  ? {
                      text: [
                        { text: 'Departamento / Department: ', bold: true },
                        clientDept,
                      ],
                      fontSize: 8,
                    }
                  : {},
                clientMuni
                  ? {
                      text: [
                        { text: 'Municipio / Municipality: ', bold: true },
                        clientMuni,
                      ],
                      fontSize: 8,
                    }
                  : {},
                clientAddress
                  ? {
                      text: [
                        { text: 'Dirección / Address: ', bold: true },
                        clientAddress,
                      ],
                      fontSize: 8,
                    }
                  : {},
                clientEmail
                  ? {
                      text: [
                        { text: 'Correo / Email: ', bold: true },
                        { text: clientEmail, color: '#1155cc' },
                      ],
                      fontSize: 8,
                    }
                  : {},
              ],
              margin: [3, 3, 3, 3],
            },
            { text: '', margin: [2, 2, 2, 2] },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
      },
      marginBottom: 4,
    },
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [14, 44, '*', 32, 58, 52, 50, 60],
      body: [
        [
          { text: '#\nItem', ...hs, margin: [1, 2, 1, 2] },
          { text: 'REFERENCIA\nReference', ...hs, margin: [1, 2, 1, 2] },
          { text: 'CONCEPTO\nConcept', ...hs, margin: [1, 2, 1, 2] },
          { text: 'UNIDAD\nQty', ...hs, margin: [1, 2, 1, 2] },
          { text: 'VALOR UNIT.\nUnit price', ...hs, margin: [1, 2, 1, 2] },
          { text: 'IVA', ...hs, margin: [1, 2, 1, 2] },
          { text: 'IPO\nINC', ...hs, margin: [1, 2, 1, 2] },
          { text: 'TOTAL', ...hs, margin: [1, 2, 1, 2] },
        ],
        ...itemRows.map((row: any[]) =>
          row.map((cell: any) => ({ ...cell, margin: [2, 2, 2, 2] })),
        ),
        ...emptyRows.map((row: any[]) =>
          row.map((cell: any) => ({ ...cell, margin: [2, 3, 2, 3] })),
        ),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cccccc',
      vLineColor: () => '#cccccc',
    },
    marginBottom: 4,
  });

  // Totales en una columna a la derecha (flex-col) para mejor lectura.
  const totalRow = (
    label: string,
    value: number,
    opts: { bold?: boolean; color?: string } = {},
  ) => [
    {
      text: label,
      bold: !!opts.bold,
      fontSize: 7,
      color: opts.color,
      fillColor: '#f2f4ef',
      alignment: 'right' as const,
      margin: [4, 2, 6, 2],
    },
    {
      text: formatCop(value),
      bold: !!opts.bold,
      fontSize: 7,
      color: opts.color,
      alignment: 'right' as const,
      margin: [4, 2, 4, 2],
    },
  ];

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 230,
        table: {
          widths: ['*', 100],
          body: [
            totalRow('SUBTOTAL / Subtotal', subtotalWithoutTax),
            totalRow('IVA', totalVat),
            ...(totalIco > 0
              ? [totalRow('IPO (INC) / Consumption tax', totalIco)]
              : []),
            totalRow('VALOR TOTAL / Total', total, { bold: true, color }),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc',
        },
      },
    ],
    marginBottom: 2,
  });

  content.push({
    text: '* Todos los precios incluyen impuestos. / All prices include taxes.',
    fontSize: 6.5,
    italics: true,
    color: '#555555',
    alignment: 'right' as const,
    marginBottom: 4,
  });

  content.push({
    table: {
      widths: ['*', 90],
      body: [
        [
          {
            text: `SON / Amount in words: ${numberToWords(total)}`,
            bold: true,
            fontSize: 7.5,
            margin: [3, 3, 3, 3],
            colSpan: 2,
          },
          {},
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cccccc',
      vLineColor: () => '#cccccc',
    },
    marginBottom: 4,
  });

  content.push({
    stack: [
      {
        text: `FORMA DE PAGO / Payment terms: ${tField(invoice.paidType?.name)}, MEDIO DE PAGO / Payment method: ${tField(invoice.payType?.name)}`,
        bold: true,
        fontSize: 8,
      },
      ...(Number(invoice.cash) > 0
        ? [
            {
              text: `Efectivo / Cash: ${formatCop(Number(invoice.cash))}`,
              fontSize: 8,
            },
          ]
        : []),
      ...(Number(invoice.transfer) > 0
        ? [
            {
              text: `Transferencia / Transfer: ${formatCop(Number(invoice.transfer))}`,
              fontSize: 8,
            },
          ]
        : []),
    ],
    marginBottom: 6,
  });

  content.push({
    canvas: [
      {
        type: 'line' as const,
        x1: 0,
        y1: 0,
        x2: 576,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#cccccc',
      },
    ],
    marginBottom: 4,
  });

  if (invoice.invoiceElectronic && invoice.factusCufe) {
    content.push({
      stack: [
        {
          text: 'Representación impresa de la Factura Electrónica de Venta / Printed representation of the Electronic Sales Invoice',
          fontSize: 7,
          bold: true,
        },
        {
          text: `CUFE: ${invoice.factusCufe}`,
          fontSize: 6.5,
          color: '#555555',
          marginTop: 2,
        },
        {
          text: `Validación DIAN / DIAN validation: ${printDate}`,
          fontSize: 6.5,
          color: '#555555',
        },
        ...(invoice.factusPublicUrl
          ? [
              {
                text: `Consulta tu factura / Check your invoice: ${invoice.factusPublicUrl}`,
                fontSize: 6.5,
                color: '#1155cc',
                link: invoice.factusPublicUrl,
              },
            ]
          : []),
      ],
      marginBottom: 4,
    });
  }

  content.push({
    text: `"Gracias por su compañía / Thank you for your stay - Documento generado por / Document generated by ${org?.legalName || ''}"`,
    alignment: 'center' as const,
    italics: true,
    fontSize: 8,
    color: '#555555',
  });

  return {
    pageSize: 'LETTER' as const,
    pageMargins: [18, 18, 18, 18],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    content,
  };
}

/**
 * Genera el PDF "branded" de la factura (la misma representación que el botón
 * "Descargar" de ver-facturas en el frontend), del lado del servidor con
 * pdfmake, para adjuntarlo a los correos de la factura electrónica.
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor() {
    pdfmake.setFonts({
      Roboto: {
        normal: path.join(ROBOTO_DIR, 'Roboto-Regular.ttf'),
        bold: path.join(ROBOTO_DIR, 'Roboto-Medium.ttf'),
        italics: path.join(ROBOTO_DIR, 'Roboto-Italic.ttf'),
        bolditalics: path.join(ROBOTO_DIR, 'Roboto-MediumItalic.ttf'),
      },
    });
    // No descargamos recursos externos (el logo lo embebemos como data URI) y
    // solo permitimos lectura local de las fuentes del propio paquete.
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy((p: string) => p.startsWith(ROBOTO_DIR));
  }

  async generateInvoicePdf(invoice: Invoice): Promise<Buffer | null> {
    try {
      const docDefinition = await buildInvoiceDoc(
        invoice,
        invoice.organizational,
      );
      const buffer = await pdfmake.createPdf(docDefinition).getBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.warn(
        `No se pudo generar el PDF branded de la factura ${invoice?.invoiceId}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }
}
