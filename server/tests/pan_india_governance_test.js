const assert = require('assert');
const { app } = require('../src/index');

async function runGovernanceTests() {
  console.log('========================================================');
  console.log('    PAN-INDIA MULTI-TIER CIVIC GOVERNANCE TEST SUITE    ');
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

  async function patch(path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
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

  function report(name, success, details = '') {
    if (success) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate National Super Admin
    const nationalAdminLogin = await post('/auth/login', {
      email: 'admin@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'National Super Admin authenticates successfully with ADMIN role',
      nationalAdminLogin.status === 200 && nationalAdminLogin.data.user?.role === 'ADMIN'
    );
    const superAdminToken = nationalAdminLogin.data.token;

    // 2. Authenticate State Admin (Rajasthan)
    const stateAdminLogin = await post('/auth/login', {
      email: 'state.rajasthan@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'State Admin authenticates successfully with STATE_ADMIN role',
      stateAdminLogin.status === 200 && stateAdminLogin.data.user?.role === 'STATE_ADMIN'
    );
    const stateAdminToken = stateAdminLogin.data.token;

    // 3. Authenticate District Admin (Kota)
    const districtAdminLogin = await post('/auth/login', {
      email: 'district.kota@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'District Admin authenticates successfully with DISTRICT_ADMIN role',
      districtAdminLogin.status === 200 && districtAdminLogin.data.user?.role === 'DISTRICT_ADMIN'
    );
    const districtAdminToken = districtAdminLogin.data.token;

    // 4. Authenticate Local Body Admin (Kota Municipal Corporation)
    const localAdminLogin = await post('/auth/login', {
      email: 'local.kota@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'Local Body Admin authenticates with LOCAL_BODY_ADMIN role',
      localAdminLogin.status === 200 && localAdminLogin.data.user?.role === 'LOCAL_BODY_ADMIN'
    );
    const localAdminToken = localAdminLogin.data.token;

    // 5. Authenticate Department Admin (Roads)
    const deptAdminLogin = await post('/auth/login', {
      email: 'dept.roads@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'Department Admin authenticates with DEPARTMENT_ADMIN role',
      deptAdminLogin.status === 200 && deptAdminLogin.data.user?.role === 'DEPARTMENT_ADMIN'
    );
    const deptAdminToken = deptAdminLogin.data.token;

    // 6. Authenticate Field Officer (Er. S. K. Verma)
    const officerLogin = await post('/auth/login', {
      email: 'officer.verma@codecivic.gov.in',
      password: 'Admin@CodeCivic2026',
    });
    report(
      'Field Officer authenticates with FIELD_OFFICER role',
      officerLogin.status === 200 && officerLogin.data.user?.role === 'FIELD_OFFICER'
    );
    const officerToken = officerLogin.data.token;

    // 7. National Super Admin accesses Pan-India Dashboard
    const nationalDash = await get('/admin/dashboard', superAdminToken);
    report(
      'National Super Admin dashboard aggregates pan-India counts',
      nationalDash.status === 200 && nationalDash.data.stats?.total >= 11
    );

    // 8. State Admin dashboard accesses state-level scope
    const stateDash = await get('/admin/dashboard', stateAdminToken);
    report(
      'State Admin dashboard scoped to Rajasthan jurisdiction',
      stateDash.status === 200 && stateDash.data.jurisdiction.includes('Rajasthan')
    );

    // 9. District Admin dashboard scoped to Kota
    const distDash = await get('/admin/dashboard', districtAdminToken);
    report(
      'District Admin dashboard scoped to Kota District',
      distDash.status === 200 && distDash.data.jurisdiction.includes('Kota')
    );

    // 10. List field officers for assignment
    const officersList = await get('/admin/officers', districtAdminToken);
    report(
      'GET /api/admin/officers returns active field officers',
      officersList.status === 200 && Array.isArray(officersList.data.officers) && officersList.data.officers.length > 0
    );

    // 11. Assign Field Officer to a real complaint
    const complaintsList = await get('/admin/complaints', districtAdminToken);
    const targetComplaint = complaintsList.data.complaints?.[0];
    const targetCompId = targetComplaint?.id || 1;

    const assignRes = await patch(`/admin/complaints/${targetCompId}/assign-officer`, {
      officer_id: officerLogin.data.user.id,
      notes: 'Please inspect with field crew today.',
    }, districtAdminToken);
    report(
      'PATCH /api/admin/complaints/:id/assign-officer successfully assigns officer',
      assignRes.status === 200 && assignRes.data.success === true
    );

    // 12. Field Officer dashboard reflects assigned task
    const officerDash = await get('/admin/dashboard', officerToken);
    report(
      'Field Officer dashboard accesses officer-scoped tasks',
      officerDash.status === 200 && officerDash.data.stats?.total >= 1
    );

    // 13. Create a new administrative staff member (e.g. Sanitation Officer)
    const newOfficerSuffix = Date.now().toString().slice(-6);
    const createStaffRes = await post('/admin/users', {
      name: 'Er. Anita Joshi',
      email: `anita.officer${newOfficerSuffix}@codecivic.gov.in`,
      mobile: `9876${newOfficerSuffix}`,
      password: 'StaffPassword2026!',
      role: 'FIELD_OFFICER',
      assigned_state: 'Rajasthan',
      assigned_district: 'Kota',
    }, districtAdminToken);
    report(
      'POST /api/admin/users successfully registers a new administrative officer',
      createStaffRes.status === 201 && createStaffRes.data.userId > 0
    );
    const newStaffId = createStaffRes.data.userId;

    // 14. List administrative staff accounts
    const staffList = await get('/admin/users', districtAdminToken);
    report(
      'GET /api/admin/users returns administrative personnel across 6 tiers',
      staffList.status === 200 && Array.isArray(staffList.data.users) && staffList.data.users.length >= 6
    );

    // 15. Toggle officer active status
    const deactivateRes = await patch(`/admin/users/${newStaffId}/status`, {
      is_active: 0,
    }, districtAdminToken);
    report(
      'PATCH /api/admin/users/:id/status successfully deactivates staff member',
      deactivateRes.status === 200 && deactivateRes.data.is_active === 0
    );

    // 16. Deactivated officer login is rejected
    const deactLogin = await post('/auth/login', {
      email: `anita.officer${newOfficerSuffix}@codecivic.gov.in`,
      password: 'StaffPassword2026!',
    });
    report(
      'Deactivated staff account login is blocked with HTTP 403',
      deactLogin.status === 403
    );

    // 17. Query states from GIS endpoint
    const statesRes = await get('/admin/geo/states', districtAdminToken);
    report(
      'GET /api/admin/geo/states returns Indian states and UTs',
      statesRes.status === 200 && Array.isArray(statesRes.data.states) && statesRes.data.states.length >= 28
    );

    // 18. Query districts for Rajasthan
    const distRes = await get('/admin/geo/districts?state_name=Rajasthan', districtAdminToken);
    report(
      'GET /api/admin/geo/districts returns Rajasthan districts including Kota',
      distRes.status === 200 && distRes.data.districts.some(d => d.name === 'Kota')
    );

    // 19. Register a new local body
    const createLbRes = await post('/admin/geo/local-bodies', {
      state_name: 'Rajasthan',
      district_name: 'Kota',
      name: `Ramganj Mandi Municipality ${newOfficerSuffix}`,
      body_type: 'MUNICIPALITY',
      pin_code_prefix: '326519',
    }, districtAdminToken);
    report(
      'POST /api/admin/geo/local-bodies registers new urban local body',
      createLbRes.status === 201 && createLbRes.data.localBodyId > 0
    );

    // 20. Audit logs endpoint returns administrative action logs
    const auditLogsRes = await get('/admin/audit-logs', superAdminToken);
    report(
      'GET /api/admin/audit-logs returns complete administrator audit trail',
      auditLogsRes.status === 200 && Array.isArray(auditLogsRes.data.logs) && auditLogsRes.data.logs.length > 0
    );

  } catch (err) {
    console.error('Fatal Governance test exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`GOVERNANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runGovernanceTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = runGovernanceTests;
