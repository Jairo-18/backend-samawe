/**
 * Test: Enviar factura interna #765 a Factus.
 * Simula lo que hace FactusInvoiceService.sendInvoiceToFactus()
 * sin arrancar NestJS — carga la factura directo de PG y llama al API.
 *
 * Run with: node scripts/test-factus-invoice.js
 */

require('dotenv').config({ path: '.env.development' });

const axios = require('axios');
const FormData = require('form-data');
const { Client } = require('pg');

const BASE_URL = process.env.FACTUS_BASE_URL;

function separator(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function mask(str) {
  if (!str) return '(null)';
  return String(str).substring(0, 30) + '...';
}

// ── Auth ────────────────────────────────────────────────────
async function getToken() {
  const form = new FormData();
  form.append('grant_type', 'password');
  form.append('client_id', process.env.FACTUS_CLIENT_ID);
  form.append('client_secret', process.env.FACTUS_CLIENT_SECRET);
  form.append('username', process.env.FACTUS_USERNAME);
  form.append('password', process.env.FACTUS_PASSWORD);
  const r = await axios.post(`${BASE_URL}/oauth/token`, form, {
    headers: { ...form.getHeaders() },
  });
  return r.data.access_token;
}

// ── DB ──────────────────────────────────────────────────────
async function loadInvoice(db, invoiceId) {
  const r = await db.query(
    `SELECT
       i."invoiceId", i."code", i."observations", i."total",
       i."invoiceElectronic", i."factusNumber", i."factusCufe",
       u."firstName", u."lastName", u."identificationNumber", u."email", u."phone", u."address",
       u."factusDv", u."factusMunicipalityCode", u."factusTributeCode", u."factusLegalOrganizationCode",
       COALESCE(it_type."factusCode", it_type.code) AS "identificationTypeCode",
       pt.code AS "payTypeCode",
       o."factusNumberingRangeId", o."factusMunicipalityCode" AS "orgMunicipalityCode"
     FROM "Invoice" i
     LEFT JOIN "User" u ON u."userId" = i."userId"
     LEFT JOIN "IdentificationType" it_type ON it_type."identificationTypeId" = u."identificationTypeId"
     LEFT JOIN "PayType" pt ON pt."payTypeId" = i."payTypeId"
     LEFT JOIN "Organizational" o ON o."organizationalId" = i."organizationalId"
     WHERE i."invoiceId" = $1 AND i."deletedAt" IS NULL`,
    [invoiceId],
  );
  if (!r.rows.length) throw new Error(`Invoice ${invoiceId} not found`);
  return r.rows[0];
}

async function loadDetails(db, invoiceId) {
  const r = await db.query(
    `SELECT
       d."invoiceDetailId", d."amount", d."priceWithoutTax", d."taxe",
       p."productId", p.code AS "productCode", p.name AS "productName",
       a."accommodationId", a.code AS "accommodationCode", a.name AS "accommodationName",
       e."excursionId", e.code AS "excursionCode", e.name AS "excursionName",
       tt."factusCode", tt."percentage"
     FROM "InvoiceDetaill" d
     LEFT JOIN "Product" p ON p."productId" = d."productId"
     LEFT JOIN "Accommodation" a ON a."accommodationId" = d."accommodationId"
     LEFT JOIN "Excursion" e ON e."excursionId" = d."excursionId"
     LEFT JOIN "TaxeType" tt ON tt."taxeTypeId" = d."taxeTypeId"
     WHERE d."invoiceId" = $1 AND d."deletedAt" IS NULL`,
    [invoiceId],
  );
  return r.rows;
}

// ── Payment mapping ─────────────────────────────────────────
const PAYMENT_MAP = {
  EFE:   { form: '1', method: '10' },
  TRAS:  { form: '1', method: '42' },
  CRE:   { form: '2', method: '1'  },
  EFECT: { form: '1', method: '10' },
  NA:    { form: '1', method: '42' },
};

// ── Build payload ───────────────────────────────────────────
function buildPayload(invoice, details, numberingRangeId) {
  const pay = PAYMENT_MAP[invoice.payTypeCode] ?? PAYMENT_MAP['TRAS'];

  const customer = {
    identification_document_code: invoice.identificationTypeCode ?? '13',
    identification: invoice.identificationNumber.trim(),
    names: `${invoice.firstName.trim()} ${invoice.lastName.trim()}`,
    address: invoice.address ?? 'Colombia',
    email: invoice.email ?? '',
    phone: invoice.phone ?? '',
    legal_organization_code: invoice.factusLegalOrganizationCode ?? '2',
    tribute_code: invoice.factusTributeCode ?? 'ZZ',
    municipality_code:
      invoice.factusMunicipalityCode ?? invoice.orgMunicipalityCode ?? '86001',
  };
  if (invoice.factusDv) customer.dv = invoice.factusDv;

  const items = details.map((d) => {
    let codeRef = 'ITEM-' + d.invoiceDetailId;
    let name = 'Ítem';
    if (d.productId) {
      codeRef = d.productCode ?? 'PROD-' + d.productId;
      const n = d.productName;
      name = (n && (n.es ?? n.en)) || 'Producto';
    } else if (d.accommodationId) {
      codeRef = d.accommodationCode ?? 'ACCOM-' + d.accommodationId;
      const n = d.accommodationName;
      name = (n && (n.es ?? n.en)) || 'Alojamiento';
    } else if (d.excursionId) {
      codeRef = d.excursionCode ?? 'EXC-' + d.excursionId;
      const n = d.excursionName;
      name = (n && (n.es ?? n.en)) || 'Excursión';
    }

    let taxCode = '01';
    let taxRate = '0.00';
    if (d.factusCode) {
      taxCode = d.factusCode;
      taxRate = (parseFloat(d.percentage) * 100).toFixed(2);
    } else if (d.taxe && parseFloat(d.taxe) > 0) {
      taxRate = parseFloat(d.taxe).toFixed(2);
    }

    return {
      code_reference: codeRef,
      name,
      quantity: parseFloat(d.amount || '1').toFixed(2),
      discount_rate: '0.00',
      price: parseFloat(d.priceWithoutTax).toFixed(2),
      unit_measure_code: '94',
      standard_code: '999',
      taxes: [{ code: taxCode, rate: taxRate }],
    };
  });

  const total = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.price);
    const taxRate = parseFloat(item.taxes[0].rate);
    return sum + qty * price * (1 + taxRate / 100);
  }, 0);

  return {
    reference_code: invoice.code,
    document: '01',
    numbering_range_id: numberingRangeId,
    operation_type: '10',
    observation: invoice.observations ?? '',
    payment_details: [{ payment_form: pay.form, payment_method_code: pay.method, amount: String(Math.round(total)) }],
    cash_rounding_amount: '0.00',
    customer,
    items,
  };
}

// ── Main ────────────────────────────────────────────────────
async function run() {
  const INVOICE_ID = 765;
  console.log(`\n🚀 Factus Invoice Test — Invoice #${INVOICE_ID}`);

  const db = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: false,
  });

  try {
    await db.connect();

    separator('STEP 1 — Cargar factura de BD');
    const invoice = await loadInvoice(db, INVOICE_ID);
    const details = await loadDetails(db, INVOICE_ID);
    console.log(`  Factura  : ${invoice.code}`);
    console.log(`  Cliente  : ${invoice.firstName} ${invoice.lastName} (${invoice.identificationNumber.trim()})`);
    console.log(`  Ítems    : ${details.length}`);
    console.log(`  Ya enviada: ${invoice.factusNumber ?? 'No'}`);

    if (invoice.factusNumber) {
      console.log('\n⚠️  Esta factura ya fue enviada a Factus.');
      console.log(`   Número: ${invoice.factusNumber}`);
      return;
    }

    separator('STEP 2 — Obtener token Factus');
    const token = await getToken();
    console.log(`  ✓ Token: ${mask(token)}`);

    separator('STEP 3 — Construir payload');
    const payload = buildPayload(invoice, details, invoice.factusNumberingRangeId);
    console.log('  reference_code:', payload.reference_code);
    console.log('  customer:', payload.customer.names, '|', payload.customer.identification);
    console.log('  items:', payload.items.length);
    payload.items.forEach((item, i) => {
      console.log(`    [${i + 1}] ${item.name} qty=${item.quantity} price=${item.price} tax=${item.taxes[0].code}@${item.taxes[0].rate}%`);
    });
    console.log('  payment amount:', payload.payment_details[0].amount);

    separator('STEP 4 — Enviar a Factus');
    const response = await axios.post(`${BASE_URL}/v2/bills/validate`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    const bill = data?.data ?? data;

    separator('RESULT');
    console.log('✅ Factura enviada a Factus exitosamente');
    console.log(`   Número        : ${bill.number}`);
    console.log(`   Referencia    : ${bill.reference_code}`);
    console.log(`   CUFE          : ${mask(bill.cufe)}`);
    console.log(`   Validada DIAN : ${bill.is_validated}`);
    console.log(`   QR            : ${bill.links?.qr ?? '(no disponible)'}`);
    console.log(`   URL pública   : ${bill.links?.public_url ?? '(no disponible)'}`);

    separator('STEP 5 — Guardar resultado en BD');
    await db.query(
      `UPDATE "Invoice"
       SET "invoiceElectronic" = true,
           "factusNumber"    = $1,
           "factusCufe"      = $2,
           "factusQrCode"    = $3,
           "factusPublicUrl" = $4,
           "factusSentAt"    = NOW()
       WHERE "invoiceId" = $5`,
      [bill.number, bill.cufe, bill.links?.qr ?? null, bill.links?.public_url ?? null, INVOICE_ID],
    );
    console.log('  ✓ Resultado guardado en tabla Invoice');

  } catch (error) {
    separator('ERROR');
    console.error('❌ Test falló');
    if (error.response) {
      console.error(`   HTTP Status  : ${error.response.status}`);
      console.error(`   Response body: ${JSON.stringify(error.response.data, null, 2)}`);
      if (error.response.status === 409) {
        console.error('\n   ⚠️  FACTURA PENDIENTE: Elimínala en el portal Factus antes de reintentar.');
      }
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
