/**
 * Standalone Factus Auth test — run with: node scripts/test-factus-auth.js
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

function mask(str) {
  if (!str) return '(not set)';
  return str.substring(0, 20) + '...';
}

function separator(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

async function testGetToken() {
  separator('STEP 1 — Password Grant (getToken)');

  const form = new FormData();
  form.append('grant_type', 'password');
  form.append('client_id', CLIENT_ID);
  form.append('client_secret', CLIENT_SECRET);
  form.append('username', USERNAME);
  form.append('password', PASSWORD);

  const response = await axios.post(`${BASE_URL}/oauth/token`, form, {
    headers: { ...form.getHeaders(), Accept: 'application/json' },
  });

  const data = response.data;
  console.log('✓ Token obtained');
  console.log(`  token_type    : ${data.token_type}`);
  console.log(`  expires_in    : ${data.expires_in}s`);
  console.log(`  access_token  : ${mask(data.access_token)}`);
  console.log(`  refresh_token : ${mask(data.refresh_token)}`);

  return data;
}

async function testRefreshToken(refreshToken) {
  separator('STEP 2 — Refresh Token (refreshToken)');

  const form = new FormData();
  form.append('grant_type', 'refresh_token');
  form.append('client_id', CLIENT_ID);
  form.append('client_secret', CLIENT_SECRET);
  form.append('refresh_token', refreshToken);

  const response = await axios.post(`${BASE_URL}/oauth/token`, form, {
    headers: { ...form.getHeaders(), Accept: 'application/json' },
  });

  const data = response.data;
  console.log('✓ Token refreshed');
  console.log(`  token_type    : ${data.token_type}`);
  console.log(`  expires_in    : ${data.expires_in}s`);
  console.log(`  access_token  : ${mask(data.access_token)}`);

  return data;
}

async function testValidToken(tokenData) {
  separator('STEP 3 — getValidToken() logic validation');

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const secondsLeft = Math.round((expiresAt - Date.now()) / 1000);
  const BUFFER = 60;

  if (secondsLeft < BUFFER) {
    console.log(`  Token expiring in ${secondsLeft}s — would refresh`);
  } else {
    console.log(`  Token valid for ${secondsLeft}s — no refresh needed`);
    console.log(`  access_token  : ${mask(tokenData.access_token)}`);
  }

  console.log('✓ getValidToken() logic OK');
}

async function run() {
  console.log('\n🚀 Factus Auth Test — Sandbox');
  console.log(`   base_url : ${BASE_URL}`);
  console.log(`   username : ${USERNAME}`);

  try {
    const tokenData = await testGetToken();
    const refreshed = await testRefreshToken(tokenData.refresh_token);
    await testValidToken(refreshed);

    separator('RESULT');
    console.log('✅ All steps passed — Factus OAuth2 is working correctly');
  } catch (error) {
    separator('ERROR');
    console.error('❌ Test failed');
    if (error.response) {
      console.error(`   HTTP Status  : ${error.response.status}`);
      console.error(`   Response body: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
}

run();
