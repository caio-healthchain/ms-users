#!/usr/bin/env node
import { config as loadEnv } from 'dotenv';

loadEnv();
loadEnv({ path: '.env.iam-pilot', override: false });

const baseUrl = (process.env.IAM_AUTH_BASE_URL || process.env.AUTH_API_BASE_URL || 'https://lazarus-users.proudmeadow-1e583df1.centralus.azurecontainerapps.io')
  .replace(/\/+$/, '');
const email = (process.env.PILOT_USER_EMAIL || 'caio.amaral').trim().toLowerCase();
const password = process.env.PILOT_USER_PASSWORD;
const invalidPassword = process.env.PILOT_INVALID_PASSWORD || `${password || 'invalid'}__wrong`;

if (!password) {
  console.error(JSON.stringify({ ok: false, message: 'Variável obrigatória ausente: PILOT_USER_PASSWORD' }, null, 2));
  process.exit(1);
}

const redact = (value) => {
  if (!value) return null;
  return `${String(value).slice(0, 8)}...redacted`;
};

const resolveHospitalId = (hospitalProfile) => {
  if (!hospitalProfile || typeof hospitalProfile !== 'object') return null;

  return (
    hospitalProfile.hospitalId
    || hospitalProfile.hospital?.id
    || hospitalProfile.id
    || null
  );
};

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  return { status: res.status, ok: res.ok, body };
}

async function main() {
  const results = [];

  const health = await request('/health', { method: 'GET' });
  results.push({ case: 'healthcheck', expected: 200, status: health.status, passed: health.status === 200 });

  const invalidLogin = await request('/users/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: invalidPassword }),
  });
  results.push({ case: 'invalid_password', expected: 401, status: invalidLogin.status, passed: invalidLogin.status === 401 });

  const validLogin = await request('/users/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const accessToken = validLogin.body?.data?.accessToken || validLogin.body?.accessToken || validLogin.body?.token;
  const refreshToken = validLogin.body?.data?.refreshToken || validLogin.body?.refreshToken;
  const hospitals = validLogin.body?.data?.hospitals || validLogin.body?.hospitals || [];

  results.push({
    case: 'valid_login',
    expected: 200,
    status: validLogin.status,
    passed: validLogin.status === 200 && Boolean(accessToken),
    token: redact(accessToken),
    hospitals: Array.isArray(hospitals) ? hospitals.length : null,
  });

  let me = null;
  if (accessToken) {
    me = await request('/users/auth/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    results.push({ case: 'authenticated_me', expected: 200, status: me.status, passed: me.status === 200 });
  } else {
    results.push({ case: 'authenticated_me', expected: 200, status: null, passed: false, skippedReason: 'accessToken ausente no login válido' });
  }

  let selectHospital = null;
  const firstHospital = Array.isArray(hospitals) ? hospitals[0] : null;
  const hospitalId = resolveHospitalId(firstHospital);
  if (accessToken && hospitalId) {
    selectHospital = await request('/users/auth/select-hospital', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ hospitalId }),
    });
    results.push({
      case: 'select_hospital',
      expected: 200,
      status: selectHospital.status,
      passed: selectHospital.status === 200,
      hospitalId,
    });
  } else {
    results.push({ case: 'select_hospital', expected: 200, status: null, passed: false, skippedReason: 'hospitalId ou accessToken ausente' });
  }

  if (refreshToken) {
    const refresh = await request('/users/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    results.push({ case: 'refresh_token', expected: 200, status: refresh.status, passed: refresh.status === 200 });
  } else {
    results.push({ case: 'refresh_token', expected: 200, status: null, passed: false, skippedReason: 'refreshToken ausente no login válido' });
  }

  const passed = results.every((item) => item.passed);
  console.log(JSON.stringify({
    ok: passed,
    action: 'iam_runtime_pilot_tests',
    baseUrl,
    login: { emailMasked: `${email.slice(0, 3)}***${email.slice(-3)}` },
    results,
  }, null, 2));

  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, action: 'iam_runtime_pilot_tests_failed', message: error.message }, null, 2));
  process.exitCode = 1;
});
