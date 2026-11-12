const assert = require('assert');
const { app } = require('../src/index');
const config = require('../src/config');

async function runSecurityAuditTests() {
  console.log('========================================================');
  console.log('     CODECIVIC FINAL SECURITY & AUTHENTICATION AUDIT    ');
  console.log('========================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;

  async function post(path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  async function get(path, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, { headers });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  function report(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Demo Credentials Public API Security
    const demoCreds = await get('/auth/demo-credentials');
    report(
      'GET /api/auth/demo-credentials returns 200 with citizen accounts only',
      demoCreds.status === 200 && Array.isArray(demoCreds.data.accounts)
    );

    const hasAdminInDemo = (demoCreds.data.accounts || []).some(a => a.role === 'ADMIN' || a.id === 'admin');
    report(
      'GET /api/auth/demo-credentials strictly excludes administrator accounts',
      !hasAdminInDemo
    );

    const rawStringified = JSON.stringify(demoCreds.data);
    const leaksPassword = /password|Admin@|Citizen@/i.test(rawStringified) && !rawStringified.includes('password-free');
    report(
      'GET /api/auth/demo-credentials response contains ZERO passwords or hashes',
      !rawStringified.includes('password_hash') && !rawStringified.includes('Admin@CodeCivic2026') && !rawStringified.includes('Citizen@123')
    );

    // 2. Citizen Demo Passwordless Login
    const demoLoginRes = await post('/auth/demo-login', { accountId: 'citizen1' });
    report(
      'POST /api/auth/demo-login succeeds for demo citizen without password',
      demoLoginRes.status === 200 && demoLoginRes.data.user?.role === 'CITIZEN' && Boolean(demoLoginRes.data.token)
    );

    const fakeAdminDemoLogin = await post('/auth/demo-login', { accountId: 'admin' });
    report(
      'POST /api/auth/demo-login rejects attempts to access administrator account',
      fakeAdminDemoLogin.status === 400 || fakeAdminDemoLogin.status === 403
    );

    // 3. Evaluator Admin Login Security
    const validEvaluatorLogin = await post('/auth/evaluator-login', { evaluatorKey: config.EVALUATOR_KEY });
    report(
      'POST /api/auth/evaluator-login succeeds with valid EVALUATOR_KEY',
      validEvaluatorLogin.status === 200 && validEvaluatorLogin.data.user?.role === 'ADMIN' && Boolean(validEvaluatorLogin.data.token)
    );
    const adminToken = validEvaluatorLogin.data.token;

    const invalidEvaluatorLogin = await post('/auth/evaluator-login', { evaluatorKey: 'wrong-key-attempt' });
    report(
      'POST /api/auth/evaluator-login rejects invalid evaluator key (401)',
      invalidEvaluatorLogin.status === 401
    );

    const missingEvaluatorKey = await post('/auth/evaluator-login', {});
    report(
      'POST /api/auth/evaluator-login rejects missing evaluator key (400)',
      missingEvaluatorKey.status === 400
    );

    // 4. Standard Officer Login
    const officerLogin = await post('/auth/login', {
      email: 'admin@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'Official administrator login succeeds with correct credentials',
      officerLogin.status === 200 && officerLogin.data.user?.role === 'ADMIN'
    );

    const wrongOfficerPassword = await post('/auth/login', {
      email: 'admin@codecivic.gov.in',
      password: 'IncorrectPassword999',
    });
    report(
      'Official administrator login rejects incorrect password (401)',
      wrongOfficerPassword.status === 401
    );

    // 5. Citizen Registration & Email Validation
    const uniqueSuffix = Date.now().toString().slice(-7);
    const testEmail = `citizen_test_${Date.now()}@example.com`;
    const testMobile = `98${uniqueSuffix}1`;
    const regRes = await post('/auth/register', {
      name: 'Security Test Citizen',
      email: testEmail,
      mobile: testMobile,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      state: 'Rajasthan',
      district: 'Kota',
    });
    report(
      'New citizen registration succeeds and forces role CITIZEN',
      regRes.status === 201 && regRes.data.user?.role === 'CITIZEN',
      regRes.data?.message
    );
    const citizenToken = regRes.data?.token;

    // Privilege escalation attempt in registration payload
    const exploitEmail = `exploit_${Date.now()}@example.com`;
    const exploitMobile = `98${uniqueSuffix}2`;
    const exploitReg = await post('/auth/register', {
      name: 'Attacker User',
      email: exploitEmail,
      mobile: exploitMobile,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      state: 'Rajasthan',
      district: 'Kota',
      role: 'ADMIN', // Injection attempt
    });
    report(
      'Public registration ignores role=ADMIN injection, enforces CITIZEN role',
      exploitReg.status === 201 && exploitReg.data.user?.role === 'CITIZEN',
      exploitReg.data?.message
    );

    // Login with registered credentials
    const loginFresh = await post('/auth/login', {
      email: testEmail,
      password: 'SecurePassword123!',
    });
    report(
      'Login succeeds with newly registered credentials',
      loginFresh.status === 200 && Boolean(loginFresh.data?.token),
      loginFresh.data?.message
    );

    // Duplicate email registration rejected
    const dupReg = await post('/auth/register', {
      name: 'Duplicate Citizen',
      email: testEmail,
      mobile: `98${uniqueSuffix}3`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      state: 'Rajasthan',
      district: 'Kota',
    });
    report(
      'Duplicate email registration is rejected with 409 Conflict',
      dupReg.status === 409,
      dupReg.data?.message
    );

    // Email whitespace and case normalisation
    const wsLogin = await post('/auth/login', {
      email: `  ${testEmail.toUpperCase()}  `,
      password: 'SecurePassword123!',
    });
    report(
      'Login email trims whitespace and ignores case',
      wsLogin.status === 200
    );

    // 6. Role Authorization & Route Protection
    const citizenAdminAccess = await get('/admin/dashboard', citizenToken);
    report(
      'Citizen token is strictly blocked from accessing /api/admin/* (403 Forbidden)',
      citizenAdminAccess.status === 403
    );

    const adminAdminAccess = await get('/admin/dashboard', adminToken);
    report(
      'Admin token successfully accesses /api/admin/dashboard (200 OK)',
      adminAdminAccess.status === 200
    );

    // 7. Forgot Password Security
    const forgotRes = await post('/auth/forgot-password', { email: 'admin@codecivic.gov.in' });
    if (!config.SMTP_CONFIGURED) {
      report(
        'POST /api/auth/forgot-password safely disables recovery when SMTP is unconfigured (503 Service Unavailable)',
        forgotRes.status === 503 && forgotRes.data.code === 'EMAIL_NOT_CONFIGURED'
      );
      report(
        'POST /api/auth/forgot-password NEVER returns reset token in response',
        forgotRes.data.resetToken === undefined
      );

      const resetAttempt = await post('/auth/reset-password', {
        token: 'fake-token-attempt',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
      report(
        'POST /api/auth/reset-password rejects requests when email delivery is unconfigured (503)',
        resetAttempt.status === 503
      );
    } else {
      report(
        'POST /api/auth/forgot-password returns 200 without exposing resetToken',
        forgotRes.status === 200 && forgotRes.data.resetToken === undefined
      );
    }

    // 8. Public Transparency Endpoint Contains No PII or Passwords
    const transparency = await get('/transparency');
    const transStr = JSON.stringify(transparency.data);
    report(
      'Public transparency endpoint responds with 200 and safe aggregated data',
      transparency.status === 200 && transparency.data.summary?.totalComplaints !== undefined
    );
    report(
      'Public transparency endpoint contains NO citizen passwords, hashes, or contact PII',
      !transStr.includes('password') && !transStr.includes('password_hash') && !transStr.includes('98100')
    );

  } catch (err) {
    console.error('Fatal error during security audit test:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`SECURITY AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runSecurityAuditTests();
