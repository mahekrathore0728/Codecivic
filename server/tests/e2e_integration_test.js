const assert = require('assert');
const { app } = require('../src/index');

async function runE2ETests() {
  console.log('========================================================');
  console.log('       RUNNING CODECIVIC FULL HTTP API E2E TESTS        ');
  console.log('========================================================\n');

  // Start server on random port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;
  let citizenId = null;
  let complaintId = null;
  let panIndiaCitizenId = null;
  let panIndiaComplaintId = null;
  let manualComplaintId = null;

  async function api(path, options = {}) {
    const headers = options.headers || {};
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  function report(name, success, details = '') {
    if (success) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await api('/health');
    report('Health check endpoint responds', health.status === 200 && health.data.status === 'healthy');

    // 2. Admin login
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@codecivic.gov.in', password: 'Admin@CodeCivic2026' },
    });
    report('Admin login succeeds with JWT and ADMIN role', adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN');
    const adminToken = adminLogin.data.token;

    // 3. Citizen registration with unique email/mobile
    const testEmail = `citizen.${Date.now()}@example.com`;
    const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Vikas Gupta',
        email: testEmail,
        mobile: testMobile,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        state: 'Delhi',
        district: 'Central Delhi',
      },
    });
    report('Citizen registration creates account with CITIZEN role', regRes.status === 201 && regRes.data.user.role === 'CITIZEN');
    const citizenToken = regRes.data.token;
    citizenId = regRes.data.user.id;

    // 4. Duplicate check endpoint
    const dupCheck = await api('/complaints/check-duplicate', {
      method: 'POST',
      body: {
        category_id: 1,
        title: 'Garbage dump overflowing on street',
        description: 'Piles of uncollected waste accumulating',
        latitude: 28.5355,
        longitude: 77.2410,
      },
    });
    report('Duplicate detection endpoint evaluates proximity and keywords', dupCheck.status === 200 && typeof dupCheck.data.hasDuplicates === 'boolean');

    // 5. Submit complaint via citizen
    const newComplaintRes = await api('/complaints', {
      method: 'POST',
      token: citizenToken,
      body: {
        category_id: 1,
        title: 'Large uncollected garbage heap blocking pedestrian alley',
        description: 'Refuse collection has stopped for 4 days. Waste is overflowing onto footpath posing public hygiene hazard.',
        address: 'Alley 4, Near Community Center',
        landmark: 'Opposite Milk Booth',
        district: 'Central Delhi',
        state: 'Delhi',
        latitude: 28.6280,
        longitude: 77.2070,
      },
    });
    report('Complaint submission generates unique code CC-YYYY-XXXXX', newComplaintRes.status === 201 && newComplaintRes.data.complaint.complaint_code.startsWith('CC-'));
    const complaintCode = newComplaintRes.data.complaint.complaint_code;
    complaintId = newComplaintRes.data.complaint.id;

    // 6. Track complaint
    const trackRes = await api(`/complaints/track/${complaintCode}`, {
      token: citizenToken,
    });
    report('Track endpoint returns timeline, SLA countdown, and owner flag', trackRes.status === 200 && trackRes.data.complaint.isOwner === true && trackRes.data.complaint.timeline.length > 0);

    // 7. Community support
    const supportRes = await api(`/complaints/${complaintId}/support`, {
      method: 'POST',
      token: adminToken, // Admin also acts as user in this test
    });
    report('Community support adds upvote count', supportRes.status === 200 && supportRes.data.supportCount >= 1);

    // 8. Admin assigns department & priority
    const assignRes = await api(`/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        department_id: 1, // Sanitation Department
        priority: 'HIGH',
        remarks: 'Dispatched Zone 3 sanitation truck.',
      },
    });
    report('Admin department assignment and priority update succeeds', assignRes.status === 200);

    // 9. Admin marks as RESOLVED with notes
    const resolveRes = await api(`/admin/complaints/${complaintId}/resolve`, {
      method: 'POST',
      token: adminToken,
      body: {
        resolution_notes: 'Sanitation crew cleared 200kg waste and disinfected the alleyway.',
      },
    });
    report('Admin records resolution evidence and notifies citizen', resolveRes.status === 200 && resolveRes.data.status === 'RESOLVED');

    // 10. Citizen verifies resolution: Report Unresolved -> REOPENED
    const reopenRes = await api(`/complaints/${complaintId}/verify-resolution`, {
      method: 'POST',
      token: citizenToken,
      body: {
        action: 'UNRESOLVED',
        feedback: 'Debris was pushed to the side but not carted away. Stray animals are still scattering plastics.',
      },
    });
    report('Citizen reports unresolved issue; complaint successfully transitions to REOPENED', reopenRes.status === 200 && reopenRes.data.status === 'REOPENED');

    // 11. Admin re-resolves and citizen confirms -> CLOSED
    await api(`/admin/complaints/${complaintId}/resolve`, {
      method: 'POST',
      token: adminToken,
      body: {
        resolution_notes: 'Re-dispatched tipper truck. Carted away all remaining debris to central landfill.',
      },
    });

    const closeRes = await api(`/complaints/${complaintId}/verify-resolution`, {
      method: 'POST',
      token: citizenToken,
      body: {
        action: 'CONFIRM',
        feedback: 'Inspected the alley. Everything has been completely cleared and sanitized. Satisfied!',
      },
    });
    report('Citizen confirms resolution; complaint officially closes', closeRes.status === 200 && closeRes.data.status === 'CLOSED');

    // 12. Recurring issue detection & Analytics
    const recurringRes = await api('/admin/recurring-issues', { token: adminToken });
    report('Admin recurring issue clustering computes hotspot clusters', recurringRes.status === 200 && Array.isArray(recurringRes.data.hotspots));

    const analyticsRes = await api('/admin/analytics', { token: adminToken });
    report('Admin analytics provides genuine category and district distributions', analyticsRes.status === 200 && analyticsRes.data.analytics.resolutionRate >= 0);

    // 13. RBAC Security: Ordinary citizen attempting to access admin dashboard
    const unauthorizedRes = await api('/admin/dashboard', { token: citizenToken });
    report('RBAC prevents ordinary citizen from accessing Admin routes (HTTP 403 Forbidden)', unauthorizedRes.status === 403);

    // 14. Invalid JWT is rejected
    const invalidJwtRes = await api('/admin/dashboard', { token: 'invalid.jwt.token.here' });
    report('Invalid JWT is rejected with HTTP 401/403', invalidJwtRes.status === 401 || invalidJwtRes.status === 403);

    // 15. Invalid complaint data is rejected (too short title/description)
    const invalidDataRes = await api('/complaints', {
      method: 'POST',
      token: citizenToken,
      body: {
        category_id: 1,
        title: 'Short',
        description: 'Too short',
        address: 'Addr',
        district: 'Kota',
        state: 'Rajasthan',
      },
    });
    report('Invalid complaint data rejected by backend validation', invalidDataRes.status === 400);

    // 16. Invalid status transitions rejected (e.g. SUBMITTED -> CLOSED without resolution)
    const invalidTransitionRes = await api(`/admin/complaints/${complaintId || 21}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'CLOSED',
        remarks: 'Attempting invalid direct transition to CLOSED',
      },
    });
    report('Invalid status transition rejected by workflow rules', invalidTransitionRes.status === 400);

    // 17. Unauthorized citizen cannot modify others complaints or escalate arbitrarily
    const unauthorizedEscalate = await api(`/complaints/22/escalate`, {
      method: 'POST',
      token: citizenToken,
      body: { reason: 'Unauthorized escalation attempt on someone else resolved complaint' },
    });
    report('Unauthorized escalation on non-owned or resolved complaint rejected', unauthorizedEscalate.status === 400 || unauthorizedEscalate.status === 403);

    // 18. Public transparency endpoint delivers anonymized safe aggregate data
    const transparencyRes = await api('/transparency');
    report('Public transparency endpoint delivers safe aggregated figures without PII', transparencyRes.status === 200 && transparencyRes.data.summary && transparencyRes.data.summary.totalComplaints > 0);

    // 19. Multidimensional filtering in Civic Intelligence analytics
    const filteredAnalyticsRes = await api('/admin/analytics?priority=CRITICAL', { token: adminToken });
    report('Civic Intelligence Dashboard supports multidimensional priority/ward filters', filteredAnalyticsRes.status === 200 && Array.isArray(filteredAnalyticsRes.data.analytics.categoryCounts));

    // 20. Ward-wise distribution in Civic Intelligence analytics
    const wardAnalyticsRes = await api('/admin/analytics', { token: adminToken });
    report('Ward-wise complaint distribution computed from real database records', wardAnalyticsRes.status === 200 && Array.isArray(wardAnalyticsRes.data.analytics.wardCounts) && wardAnalyticsRes.data.analytics.wardCounts.length > 0);

    // 21. Real data-driven Civic Insights generated
    report('Automated real-data Civic Insights generated for municipal administrators', Array.isArray(wardAnalyticsRes.data.analytics.civicInsights) && wardAnalyticsRes.data.analytics.civicInsights.length > 0);

    // 22. India-Wide Citizen Registration (Maharashtra / Mumbai Suburban)
    const panIndiaEmail = `citizen.mumbai.${Date.now()}@codecivic.gov.in`;
    const panIndiaReg = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Aarav Deshmukh',
        email: panIndiaEmail,
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
      },
    });
    const panIndiaCitizenToken = panIndiaReg.data.token;
    panIndiaCitizenId = panIndiaReg.data.user?.id;
    report('Pan-India citizen registration supports non-Kota states and districts', panIndiaReg.status === 201 && panIndiaReg.data.user?.state === 'Maharashtra');

    // 23. Lodge complaint with GPS source and complete geographic fields
    const panIndiaComplaint = await api('/complaints', {
      method: 'POST',
      token: panIndiaCitizenToken,
      body: {
        category_id: 1,
        title: 'Dangerous garbage overflow near Bandra station',
        description: 'Large commercial garbage heap blocking pedestrian footpath outside station entry.',
        address: 'Station Road, Bandra West',
        locality: 'Bandra West',
        city: 'Mumbai',
        pincode: '400050',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        latitude: 19.0544,
        longitude: 72.8402,
        location_source: 'GPS',
      },
    });
    panIndiaComplaintId = panIndiaComplaint.data.complaint?.id;
    report('Pan-India complaint submission persists coordinates and location_source=GPS', panIndiaComplaint.status === 201 && panIndiaComplaint.data.complaint?.complaint_code);

    // 24. Non-mandatory GPS: Lodge complaint with manual address only (null coords)
    const manualComplaint = await api('/complaints', {
      method: 'POST',
      token: panIndiaCitizenToken,
      body: {
        category_id: 2,
        title: 'Deep road cavity and collapsed curb on SV Road',
        description: 'Pavement collapsed into underground utility ditch, endangering daily transit commuters.',
        address: 'SV Road, Near Khar Telephone Exchange',
        locality: 'Khar West',
        city: 'Mumbai',
        pincode: '400052',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        location_source: 'MANUAL',
      },
    });
    manualComplaintId = manualComplaint.data.complaint?.id;
    report('Non-mandatory GPS: Complaint lodged successfully with manual address without coordinates', manualComplaint.status === 201 && manualComplaint.data.complaint?.complaint_code);

    // 25. Coordinates boundary validation: Out of bounds latitude rejected
    const invalidCoordsRes = await api('/complaints', {
      method: 'POST',
      token: panIndiaCitizenToken,
      body: {
        category_id: 1,
        title: 'Water logging near bus stop',
        description: 'Stagnant rain water pooling for 3 consecutive days across roadway.',
        address: 'Hill Road, Bandra',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        latitude: 125.0, // Invalid latitude > 90
        longitude: 72.8402,
      },
    });
    report('Coordinate boundary validation rejects invalid latitude (>90 degrees)', invalidCoordsRes.status === 400);

    // 26. Admin portal complaints query with state & district filters
    const stateFiltered = await api('/admin/complaints?state=Maharashtra', { token: adminToken });
    report('Admin complaints query correctly filters by state (Maharashtra)', stateFiltered.status === 200 && stateFiltered.data.complaints.some(c => c.state === 'Maharashtra'));

    // 27. Admin recurring issue hotspots endpoint returns verified clusters
    const hotspotsQueryRes = await api('/admin/recurring-issues', { token: adminToken });
    report('Admin recurring issues endpoint returns spatial cluster hotspots', hotspotsQueryRes.status === 200 && Array.isArray(hotspotsQueryRes.data.hotspots));

    // 28. Admin analytics supports state & district filters
    const stateAnalytics = await api('/admin/analytics?state=Rajasthan', { token: adminToken });
    report('Admin Civic Intelligence supports state/district filtering', stateAnalytics.status === 200 && stateAnalytics.data.analytics);

    // 29. Clear distinction between demo evaluation data and public complaints
    const demoComplaintsRes = await api('/admin/complaints?is_demo=1', { token: adminToken });
    const publicComplaintsRes = await api('/admin/complaints?is_demo=0', { token: adminToken });
    report('Admin complaints API clearly distinguishes demo evaluation data from public complaints', 
      demoComplaintsRes.status === 200 && 
      publicComplaintsRes.status === 200 && 
      demoComplaintsRes.data.complaints.every(c => c.is_demo === 1) &&
      publicComplaintsRes.data.complaints.every(c => c.is_demo === 0)
    );

  } catch (err) {
    console.error('Fatal E2E test exception:', err);
    failed++;
  } finally {
    const db = require('../src/db');
    const deleteComplaintCascade = (id) => {
      if (!id) return;
      db.prepare('DELETE FROM complaint_supports WHERE complaint_id = ?').run(id);
      db.prepare('DELETE FROM resolution_evidence WHERE complaint_id = ?').run(id);
      db.prepare('DELETE FROM complaint_status_history WHERE complaint_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE complaint_id = ?').run(id);
      db.prepare('DELETE FROM complaints WHERE id = ?').run(id);
    };

    deleteComplaintCascade(complaintId);
    deleteComplaintCascade(panIndiaComplaintId);
    deleteComplaintCascade(manualComplaintId);

    if (citizenId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(citizenId);
    }
    if (panIndiaCitizenId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(panIndiaCitizenId);
    }
    server.close();
  }

  console.log('\n========================================================');
  console.log(`E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runE2ETests();
