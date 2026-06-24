/**
 * Standalone Factus Bill test — run with: node scripts/test-factus-bill.js
 * Reads credentials from .env.development via dotenv
 */

require('dotenv').config({ path: '.env.development' });

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.FACTUS_BASE_URL;
const CLIENT_ID = process.env.FACTUS_CLIENT_ID;
const CLIENT_SECRET = process.env.FACTUS_CLIENT_SECRET;
const USERNAME = process.env.FACTUS_USERNAME;
const PASSWORD = process.env.FACTUS_PASSWORD;
const NUMBERING_RANGE_ID = Number(process.env.FACTUS_NUMBERING_RANGE_ID ?? '389');

function mask(str) {
  if (!str) return '(not set)';
  return String(str).substring(0, 30) + '...';
}

function separator(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

async function getToken() {
  const form = new FormData();
  form.append('grant_type', 'password');
  form.append('client_id', CLIENT_ID);
  form.append('client_secret', CLIENT_SECRET);
  form.append('username', USERNAME);
  form.append('password', PASSWORD);

  const response = await axios.post(`${BASE_URL}/oauth/token`, form, {
    headers: { ...form.getHeaders(), Accept: 'application/json' },
  });
  return response.data.access_token;
}

const TEST_BILL_PAYLOAD = {
  reference_code: 'FACT-2026-0124',
  document: '01',
  numbering_range_id: NUMBERING_RANGE_ID,
  operation_type: '10',
  observation: 'Observación de prueba',
  payment_details: [
    {
      payment_form: '1',
      payment_method_code: '42',
      reference_code: 'pago-001',
      amount: '83300',
    },
  ],
  cash_rounding_amount: '0.00',
  customer: {
    identification_document_code: '31',
    identification: '123456789',
    company: 'Alan company name',
    trade_name: 'Alan trade name',
    address: 'calle 1 # 1-1',
    email: 'alan.company@email.com',
    phone: '1234567890',
    legal_organization_code: '1',
    tribute_code: 'ZZ',
    municipality_code: '68679',
  },
  items: [
    {
      code_reference: 'PROD-000A',
      name: 'Producto A',
      quantity: '1.00',
      discount_rate: '0.00',
      price: '10000.00',
      unit_measure_code: '94',
      standard_code: '999',
      taxes: [{ code: '01', rate: '19.00' }],
    },
    {
      code_reference: 'PROD-000B',
      name: 'Producto B',
      quantity: '3.00',
      discount_rate: '0.00',
      price: '20000.00',
      unit_measure_code: '94',
      standard_code: '999',
      taxes: [{ code: '01', rate: '19.00' }],
    },
  ],
};

async function createAndValidateBill(token) {
  separator('STEP 1 — Crear y validar factura electrónica');

  console.log(`  reference_code   : ${TEST_BILL_PAYLOAD.reference_code}`);
  console.log(`  numbering_range  : ${TEST_BILL_PAYLOAD.numbering_range_id}`);
  console.log(`  customer NIT     : ${TEST_BILL_PAYLOAD.customer.identification}`);
  console.log(`  items count      : ${TEST_BILL_PAYLOAD.items.length}`);
  console.log(`  payment amount   : ${TEST_BILL_PAYLOAD.payment_details[0].amount}`);

  const response = await axios.post(`${BASE_URL}/v2/bills/validate`, TEST_BILL_PAYLOAD, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

function extractBillInfo(responseData) {
  const bill = responseData?.data?.bill ?? responseData?.data ?? responseData;
  return {
    billNumber: bill?.number ?? bill?.bill_number ?? '(no disponible)',
    referenceCode: bill?.reference_code ?? '(no disponible)',
    isValidated: bill?.is_validated ?? false,
    cufe: bill?.cufe ?? '(no disponible)',
    qrCode: bill?.qr_code ?? bill?.qrCode ?? null,
  };
}

async function run() {
  console.log('\n🚀 Factus Bill Test — Sandbox');
  console.log(`   base_url : ${BASE_URL}`);
  console.log(`   username : ${USERNAME}`);

  try {
    separator('AUTH — Obteniendo token');
    const token = await getToken();
    console.log(`  ✓ Token obtenido: ${mask(token)}`);

    const responseData = await createAndValidateBill(token);

    separator('RESPUESTA COMPLETA DEL API');
    console.log(JSON.stringify(responseData, null, 2));

    const bill = extractBillInfo(responseData);

    separator('RESULT');
    console.log('✅ Factura creada exitosamente');
    console.log(`   Número         : ${bill.billNumber}`);
    console.log(`   Referencia     : ${bill.referenceCode}`);
    console.log(`   CUFE           : ${mask(bill.cufe)}`);
    console.log(`   Validada DIAN  : ${bill.isValidated}`);
    if (bill.qrCode) console.log(`   QR Code        : ${mask(bill.qrCode)}`);
  } catch (error) {
    separator('ERROR');
    console.error('❌ Test falló');
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      console.error(`   HTTP Status  : ${status}`);
      console.error(`   Response body: ${JSON.stringify(data, null, 2)}`);

      if (status === 409) {
        console.error('\n   ⚠️  FACTURA PENDIENTE: Hay una factura con este reference_code');
        console.error('       pendiente por enviar a la DIAN. Elimínala en el portal de');
        console.error('       Factus antes de volver a intentarlo.');
      } else if (status === 422) {
        console.error('\n   ⚠️  ERRORES DE VALIDACIÓN:');
        const errors = data?.errors ?? {};
        Object.entries(errors).forEach(([field, msgs]) => {
          (Array.isArray(msgs) ? msgs : [msgs]).forEach((m) => console.error(`       - ${field}: ${m}`));
        });
      }
    } else {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
}

run();
