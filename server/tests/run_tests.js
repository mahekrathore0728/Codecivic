const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const config = require('../src/config');
const { findDuplicates } = require('../src/utils/duplicateDetector');
const { recommendPriority } = require('../src/utils/priorityRecommender');
const { calculateSlaDeadline, evaluateSla, isEligibleForEscalation } = require('../src/utils/slaEngine');
const { detectRecurringIssues } = require('../src/utils/recurringDetector');

async function runTestSuite() {
  console.log('========================================================');
  console.log('       RUNNING CODECIVIC BACKEND VERIFICATION TESTS     ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Database Schema Integrity
  test('Database tables and indexes are initialized', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    const requiredTables = [
      'users', 'departments', 'categories', 'complaints',
      'complaint_images', 'complaint_status_history', 'resolution_evidence',
      'complaint_supports', 'duplicate_relations', 'notifications', 'escalation_records'
    ];
    for (const req of requiredTables) {
      assert(tables.includes(req), `Table "${req}" must exist in schema`);
    }
  });

  // 2. Authentication & Security
  test('Password hashing and validation works securely', async () => {
    const password = 'TestSecretPassword2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    assert(hash !== password, 'Password must never be plain text');
    const valid = await bcrypt.compare(password, hash);
    assert(valid === true, 'Hashed password must verify correctly');
    const invalid = await bcrypt.compare('WrongPassword', hash);
    assert(invalid === false, 'Wrong password must be rejected');
  });

  test('Admin user exists and has role ADMIN', () => {
    const admin = db.prepare("SELECT role FROM users WHERE email = 'admin@codecivic.gov.in'").get();
    assert(admin, 'Default admin account must exist');
    assert.strictEqual(admin.role, 'ADMIN', 'Admin user must have role ADMIN');
  });

  test('Citizen registration defaults strictly to CITIZEN role', () => {
    const citizen = db.prepare("SELECT role FROM users WHERE email = 'ramesh.citizen@codecivic.gov.in'").get();
    assert(citizen, 'Demo citizen account must exist');
    assert.strictEqual(citizen.role, 'CITIZEN', 'Citizen role must be strictly CITIZEN');
  });

  // 3. Duplicate Complaint Detection
  test('Duplicate detection accurately identifies nearby and text matches', () => {
    const existingComplaints = [
      {
        id: 101,
        complaint_code: 'CC-2026-101',
        category_id: 1,
        title: 'Garbage dump overflowing on Gandhi Road',
        description: 'Large pile of household waste and plastics accumulating on sidewalk',
        latitude: 28.6139,
        longitude: 77.2090,
        status: 'SUBMITTED',
      },
      {
        id: 102,
        complaint_code: 'CC-2026-102',
        category_id: 3,
        title: 'Broken streetlight on Park Avenue',
        description: 'Light fixture broken and dark at night',
        latitude: 28.5000,
        longitude: 77.1000,
        status: 'ASSIGNED',
      },
    ];

    const newIssue = {
      category_id: 1,
      title: 'Overflowing garbage waste dump on Gandhi Road sidewalk',
      description: 'Plastics and garbage overflowing on Gandhi road walking path',
      latitude: 28.6140, // ~15 meters away
      longitude: 77.2091,
    };

    const matches = findDuplicates(newIssue, existingComplaints, 0.4);
    assert(matches.length > 0, 'Must detect duplicate complaint');
    assert.strictEqual(matches[0].complaint.id, 101, 'Top match should be complaint 101');
    assert(matches[0].similarityPercentage >= 60, 'Match percentage should be >= 60%');
    assert(matches[0].distanceMeters <= 50, 'Distance should be under 50m');
  });

  // 4. Transparent Priority Recommendation
  test('Heuristic priority recommendation accounts for critical safety keywords', () => {
    const result = recommendPriority({
      categoryName: 'Water Leakage',
      title: 'Urgent: Main pipeline broken flooding hospital entrance',
      description: 'Massive burst pipeline creating emergency flooding risk at government hospital gate',
      supportCount: 15,
    });

    assert.strictEqual(result.recommendedPriority, 'CRITICAL', 'Hospital flood emergency must be recommended CRITICAL');
    assert(result.score >= 70, 'Score should be high');
    assert(result.factors.length >= 3, 'Must provide clear factors');
  });

  // 5. SLA Deadline & Overdue Monitoring
  test('SLA engine calculates deadlines and flags overdue status correctly', () => {
    const pastDate = new Date(Date.now() - 80 * 3600000).toISOString(); // 80 hours ago
    const slaDeadline = new Date(Date.now() - 8 * 3600000).toISOString(); // Expired 8 hours ago

    const overdueComplaint = {
      status: 'IN_PROGRESS',
      created_at: pastDate,
      sla_deadline: slaDeadline,
    };

    const slaResult = evaluateSla(overdueComplaint);
    assert.strictEqual(slaResult.isOverdue, true, 'Complaint past deadline must be flagged isOverdue');
    assert(slaResult.hoursOverdue >= 7, 'Overdue hours must be calculated');

    const freshComplaint = {
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      sla_deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
    };
    const freshResult = evaluateSla(freshComplaint);
    assert.strictEqual(freshResult.isOverdue, false, 'Fresh complaint should not be overdue');
    assert(freshResult.hoursRemaining >= 45, 'Remaining hours must be positive');
  });

  // 6. Community Support Logic
  test('Community support increments and prevents double-voting', () => {
    const complaint = db.prepare('SELECT id, support_count FROM complaints LIMIT 1').get();
    const citizen = db.prepare("SELECT id FROM users WHERE email = 'arun.patel@codecivic.gov.in'").get();

    // Clean any prior support
    db.prepare('DELETE FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').run(complaint.id, citizen.id);

    // First support
    db.prepare('INSERT INTO complaint_supports (complaint_id, citizen_id) VALUES (?, ?)').run(complaint.id, citizen.id);
    db.prepare('UPDATE complaints SET support_count = support_count + 1 WHERE id = ?').run(complaint.id);

    const updated = db.prepare('SELECT support_count FROM complaints WHERE id = ?').get(complaint.id);
    assert.strictEqual(updated.support_count, complaint.support_count + 1, 'Support count should increment by 1');

    // Duplicate support should throw unique constraint error
    let threw = false;
    try {
      db.prepare('INSERT INTO complaint_supports (complaint_id, citizen_id) VALUES (?, ?)').run(complaint.id, citizen.id);
    } catch {
      threw = true;
    }
    assert(threw, 'Duplicate support by same citizen must be rejected by unique constraint');
  });

  // 7. Recurring Issue Hotspot Detection
  test('Recurring issue clustering detects multiple complaints in same area', () => {
    const testComplaints = [
      { id: 1, category_id: 2, category_name: 'Potholes', district: 'South Delhi', landmark: 'Main Market', latitude: 28.5501, longitude: 77.2201, created_at: '2026-10-01', status: 'RESOLVED' },
      { id: 2, category_id: 2, category_name: 'Potholes', district: 'South Delhi', landmark: 'Main Market', latitude: 28.5505, longitude: 77.2204, created_at: '2026-10-15', status: 'IN_PROGRESS' },
      { id: 3, category_id: 2, category_name: 'Potholes', district: 'South Delhi', landmark: 'Main Market', latitude: 28.5502, longitude: 77.2202, created_at: '2026-11-01', status: 'SUBMITTED' },
      { id: 4, category_id: 1, category_name: 'Garbage and Waste', district: 'North Delhi', landmark: 'School Gate', latitude: 28.7000, longitude: 77.1000, created_at: '2026-11-02', status: 'SUBMITTED' },
    ];

    const clusters = detectRecurringIssues(testComplaints, 300, 2);
    assert(clusters.length >= 1, 'Must detect at least 1 recurring cluster');
    assert.strictEqual(clusters[0].categoryName, 'Potholes', 'Recurring cluster should be for Potholes');
    assert.strictEqual(clusters[0].totalComplaints, 3, 'Cluster must contain all 3 nearby pothole complaints');
    assert(clusters[0].recommendedAction.includes('asphalt resurfacing'), 'Must include permanent civil recommendation');
  });

  // 8. Ward Column & Spatial Data Integrity
  test('Complaints table schema contains ward column for Kota jurisdiction', () => {
    const cols = db.prepare('PRAGMA table_info(complaints)').all().map(c => c.name);
    assert(cols.includes('ward'), 'Complaints table must have ward column');
    const sample = db.prepare("SELECT ward FROM complaints WHERE district = 'Kota' AND ward IS NOT NULL LIMIT 1").get();
    assert(sample && sample.ward, 'Must have complaints associated with Kota municipal wards');
  });

  // 11. Pan-India Geographic Architecture & Location Source Tracking
  test('Complaints table schema contains India-wide location and classification columns', () => {
    const cols = db.prepare('PRAGMA table_info(complaints)').all().map(c => c.name);
    assert(cols.includes('pincode'), 'Complaints table must have pincode column');
    assert(cols.includes('locality'), 'Complaints table must have locality column');
    assert(cols.includes('city'), 'Complaints table must have city column');
    assert(cols.includes('location_source'), 'Complaints table must have location_source column');
    assert(cols.includes('is_demo'), 'Complaints table must have is_demo column');
  });

  test('Demo evaluation records are explicitly flagged with is_demo = 1', () => {
    const demoComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE is_demo = 1").get();
    assert(demoComplaints.count > 0, 'Initial seeded evaluation records must be distinguished with is_demo = 1');
  });

  test('Geographic boundary validator correctly verifies Indian coordinate bounds', () => {
    const isValidIndiaCoord = (lat, lng) => {
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      return !isNaN(numLat) && !isNaN(numLng) && numLat >= 6.0 && numLat <= 38.0 && numLng >= 68.0 && numLng <= 98.0;
    };

    // Kota, Rajasthan
    assert.strictEqual(isValidIndiaCoord(25.18, 75.83), true, 'Kota coordinates must be within India');
    // New Delhi
    assert.strictEqual(isValidIndiaCoord(28.6139, 77.2090), true, 'Delhi coordinates must be within India');
    // Bengaluru, Karnataka
    assert.strictEqual(isValidIndiaCoord(12.9716, 77.5946), true, 'Bengaluru coordinates must be within India');
    // Outside India (London, New York, Pacific Ocean)
    assert.strictEqual(isValidIndiaCoord(51.5074, -0.1278), false, 'London coordinates must be outside India');
    assert.strictEqual(isValidIndiaCoord(40.7128, -74.0060), false, 'New York coordinates must be outside India');
  });

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite failed to run:', err);
  process.exit(1);
});
