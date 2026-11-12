const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDatabase() {
  console.log('Seeding CodeCivic database for Kota, Rajasthan...');

  // 1. Seed Municipal Departments
  const departments = [
    {
      name: 'Sanitation Department',
      description: 'Solid waste management, secondary transfer stations, community dumpsters, and road sweeping.',
      contact_email: 'sanitation.kota@codecivic.gov.in',
      contact_phone: '0744-2501001',
      head_officer: 'S. K. Verma (Chief Municipal Sanitation Officer)',
      sla_hours_default: 48,
    },
    {
      name: 'Road Infrastructure Department',
      description: 'Asphalt resurfacing, pothole filling, speed breakers, footpaths, and divider maintenance.',
      contact_email: 'roads.kota@codecivic.gov.in',
      contact_phone: '0744-2501002',
      head_officer: 'Er. Rajesh Meena (Superintending Engineer)',
      sla_hours_default: 72,
    },
    {
      name: 'Water Supply Board',
      description: 'Chambal drinking water trunk lines, consumer pipeline leaks, booster pumps, and water quality testing.',
      contact_email: 'water.kota@codecivic.gov.in',
      contact_phone: '0744-2501003',
      head_officer: 'Sunita Rao (Executive Engineer)',
      sla_hours_default: 24,
    },
    {
      name: 'Drainage & Stormwater Department',
      description: 'Stormwater culverts, underground sewer trunk lines, manhole covers, and monsoon flood de-silting.',
      contact_email: 'drainage.kota@codecivic.gov.in',
      contact_phone: '0744-2501004',
      head_officer: 'A. K. Sharma (Divisional Officer)',
      sla_hours_default: 48,
    },
    {
      name: 'Electrical & Lighting Department',
      description: 'Smart LED streetlights, high-mast illumination, underground cabling, and transformer pole safety.',
      contact_email: 'electrical.kota@codecivic.gov.in',
      contact_phone: '0744-2501005',
      head_officer: 'Pradeep Joshi (Chief Electrical Inspector)',
      sla_hours_default: 48,
    },
  ];

  const insertDept = db.prepare(`
    INSERT OR REPLACE INTO departments (id, name, description, contact_email, contact_phone, head_officer, sla_hours_default)
    VALUES (
      COALESCE((SELECT id FROM departments WHERE name = ?), NULL),
      ?, ?, ?, ?, ?, ?
    )
  `);

  for (const d of departments) {
    const existing = db.prepare('SELECT id FROM departments WHERE name = ?').get(d.name);
    if (!existing) {
      db.prepare(`
        INSERT INTO departments (name, description, contact_email, contact_phone, head_officer, sla_hours_default)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(d.name, d.description, d.contact_email, d.contact_phone, d.head_officer, d.sla_hours_default);
    }
  }

  // 2. Seed Standard Categories
  const deptMap = {};
  db.prepare('SELECT id, name FROM departments').all().forEach((d) => {
    deptMap[d.name] = d.id;
  });

  const categories = [
    {
      name: 'Garbage and Waste',
      description: 'Accumulated roadside garbage, overflowing public dumpsters, illegal dumping, or lack of sweeping.',
      icon: 'Trash2',
      default_priority: 'MEDIUM',
      dept: 'Sanitation Department',
    },
    {
      name: 'Road Damage',
      description: 'Cracked road surfaces, damaged pavements, broken curbs, or caved-in road sections.',
      icon: 'Construction',
      default_priority: 'HIGH',
      dept: 'Road Infrastructure Department',
    },
    {
      name: 'Potholes',
      description: 'Hazardous road cavities and deep craters threatening two-wheelers and transit vehicles.',
      icon: 'AlertTriangle',
      default_priority: 'HIGH',
      dept: 'Road Infrastructure Department',
    },
    {
      name: 'Water Leakage',
      description: 'Burst distribution mains, leaking consumer joints, drinking water loss, or low pipeline pressure.',
      icon: 'Droplets',
      default_priority: 'CRITICAL',
      dept: 'Water Supply Board',
    },
    {
      name: 'Drainage Problems',
      description: 'Choked storm drains, overflowing sewer manholes, stagnant foul water, or missing manhole covers.',
      icon: 'Waves',
      default_priority: 'HIGH',
      dept: 'Drainage & Stormwater Department',
    },
    {
      name: 'Streetlight Issues',
      description: 'Non-functional streetlights, blinking LED luminaires, open feeder pillars, or dark transit stretches.',
      icon: 'Lightbulb',
      default_priority: 'MEDIUM',
      dept: 'Electrical & Lighting Department',
    },
    {
      name: 'Public Sanitation',
      description: 'Unsanitary public convenience complexes, open urination hotspots, or foul odors near markets.',
      icon: 'Sparkles',
      default_priority: 'MEDIUM',
      dept: 'Sanitation Department',
    },
    {
      name: 'Other Civic Issues',
      description: 'Encroachments, fallen tree boughs, loose hanging cables, or stray cattle traffic hazards.',
      icon: 'HelpCircle',
      default_priority: 'LOW',
      dept: 'Sanitation Department',
    },
  ];

  for (const cat of categories) {
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
    if (!existing) {
      db.prepare(`
        INSERT INTO categories (name, description, icon, default_priority, default_department_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(cat.name, cat.description, cat.icon, cat.default_priority, deptMap[cat.dept] || null);
    }
  }

  // 3. Seed Demo Users with Guaranteed Passwords & Kota, Rajasthan Jurisdiction
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@CodeCivic2026', salt);
  const citizenHash = await bcrypt.hash('Citizen@123', salt);

  const upsertUser = (name, email, mobile, hash, role, state, district) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      // SAFE UPSERT: Only insert reference fields that are missing.
      // NEVER overwrite password_hash — a returning citizen may have changed their password.
      // Only update non-sensitive identity fields (name, role, state, district) if they haven't
      // been personalised, and ensure the mobile number column is not colliding.
      // For demo accounts, we do update name/role/state/district so they stay canonical,
      // but we deliberately preserve any password change made by a human operator.
      db.prepare(`
        UPDATE users
        SET name = ?, role = ?, state = ?, district = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, role, state, district, existing.id);
      return existing.id;
    } else {
      const info = db.prepare(`
        INSERT INTO users (name, email, mobile, password_hash, role, state, district)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, email, mobile, hash, role, state, district);
      return info.lastInsertRowid;
    }
  };

  const adminId = upsertUser('Kota Municipal Commissioner', 'admin@codecivic.gov.in', '9810012345', adminHash, 'ADMIN', 'Rajasthan', 'Kota');
  const rameshId = upsertUser('Ramesh Kumar', 'ramesh.citizen@codecivic.gov.in', '9820054321', citizenHash, 'CITIZEN', 'Rajasthan', 'Kota');
  const priyaId = upsertUser('Priya Sharma', 'priya.sharma@codecivic.gov.in', '9830098765', citizenHash, 'CITIZEN', 'Rajasthan', 'Kota');

  // 4. Seed 11 Realistic, Unique Complaints in Kota, Rajasthan with Sequential IDs CC-2026-00001 ... CC-2026-00011
  const catMap = {};
  db.prepare('SELECT id, name FROM categories').all().forEach((c) => {
    catMap[c.name] = c.id;
  });

  // Clear existing demo complaints if resetting or if complaints are below 11
  const currentCount = db.prepare('SELECT COUNT(*) AS count FROM complaints').get().count;

  // We check if the 11 sequential demo complaints exist. If not, seed them.
  const sampleComplaints = [
    {
      code: 'CC-2026-00001',
      citizen_id: rameshId,
      category: 'Potholes',
      dept: 'Road Infrastructure Department',
      title: 'Deep hazardous road craters on Jhalawar Road near Aerodrome Circle',
      description: 'Multiple deep potholes spanning the main carriageway towards Vigyan Nagar. Motorcyclists are swerving dangerously during peak coaching hours, posing severe accident risks.',
      address: 'Jhalawar Road, 100m before Aerodrome Flyover',
      landmark: 'Near Petrol Pump & Coaching Arcade',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1610,
      lng: 75.8420,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      sla_hours_remaining: 24,
      support_count: 28,
      is_escalated: 0,
      days_ago: 3,
    },
    {
      code: 'CC-2026-00002',
      citizen_id: priyaId,
      category: 'Garbage and Waste',
      dept: 'Sanitation Department',
      title: 'Overflowing commercial waste dumpster outside Vigyan Nagar Market',
      description: 'Secondary community dumpster has not been cleared for three consecutive days. Solid municipal waste and plastics have spilled into the main pedestrian walkway with stray animals scattering food waste.',
      address: 'Main Market Lane, Block B, Vigyan Nagar',
      landmark: 'Behind Community Dispensary',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1389,
      lng: 75.8458,
      priority: 'MEDIUM',
      status: 'RESOLVED',
      sla_hours_remaining: 0,
      support_count: 34,
      is_escalated: 0,
      days_ago: 5,
      resolution_notes: 'Sanitation tipper truck deployed with 4 sanitation workers. Cleared 2.4 tons of commercial garbage and disinfected the concrete apron with lime and bleaching powder.',
    },
    {
      code: 'CC-2026-00003',
      citizen_id: rameshId,
      category: 'Water Leakage',
      dept: 'Water Supply Board',
      title: 'High-pressure potable pipeline rupture flooding road near MBS Hospital',
      description: 'The 300mm underground distribution main has burst. Pressurized potable drinking water is gushing out, submerging the access road to the hospital emergency wing and causing severe low pressure in surrounding wards.',
      address: 'Hospital Approach Road, Nayapura',
      landmark: 'Opposite MBS Hospital Emergency Gate',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1872,
      lng: 75.8431,
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      sla_hours_remaining: 8,
      support_count: 42,
      is_escalated: 1,
      escalation_reason: 'Drinking water is gushing onto the road while dialysis and emergency units are experiencing water supply disruption.',
      days_ago: 1,
    },
    {
      code: 'CC-2026-00004',
      citizen_id: priyaId,
      category: 'Drainage Problems',
      dept: 'Drainage & Stormwater Department',
      title: 'Choked underground stormwater culvert causing foul sewage backflow',
      description: 'The main trunk storm culvert is clogged with silt and plastic debris. Sewage is backing up into house driveways and the road gutter is overflowing with stagnant foul water.',
      address: 'Street 4, Sector 4, Talwandi',
      landmark: 'Near Commerce College Circle',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1534,
      lng: 75.8361,
      priority: 'HIGH',
      status: 'REOPENED',
      sla_hours_remaining: 18,
      support_count: 19,
      is_escalated: 0,
      days_ago: 6,
      reopen_count: 1,
      resolution_notes: 'Culvert mouth opened and surface trash removed with rakes.',
      citizen_feedback: 'Only the opening was cleared. The internal underground culvert remains heavily choked and water began backflowing again this morning.',
    },
    {
      code: 'CC-2026-00005',
      citizen_id: rameshId,
      category: 'Streetlight Issues',
      dept: 'Electrical & Lighting Department',
      title: 'Dark stretch of non-functional streetlights on Rangbari Road',
      description: 'Five consecutive LED luminaires along the canal road have failed, creating a pitch-black corridor of over 300 meters. Extremely unsafe for students returning from coaching institutes after dark.',
      address: 'Rangbari Main Road, Mahaveer Nagar Extension',
      landmark: 'Near Rajiv Gandhi Nagar Crossing',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1481,
      lng: 75.8267,
      priority: 'MEDIUM',
      status: 'UNDER_REVIEW',
      sla_hours_remaining: -14, // Overdue by 14h
      support_count: 15,
      is_escalated: 1,
      escalation_reason: 'Unlit transit corridor for 5 consecutive nights with no response from electrical field depot.',
      days_ago: 4,
    },
    {
      code: 'CC-2026-00006',
      citizen_id: priyaId,
      category: 'Road Damage',
      dept: 'Road Infrastructure Department',
      title: 'Broken pavement and exposed utility trench in Landmark City coaching hub',
      description: 'Underground telecom fiber trench was dug 2 weeks ago and left open without backfilling. The pedestrian footpath has collapsed into the ditch, forcing hundreds of students onto the heavy traffic carriageway.',
      address: 'Main Avenue, Landmark City, Kunhari',
      landmark: 'Opposite Allen Samyak Campus Gate',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.2014,
      lng: 75.8298,
      priority: 'HIGH',
      status: 'SUBMITTED',
      sla_hours_remaining: 38,
      support_count: 23,
      is_escalated: 0,
      days_ago: 2,
    },
    {
      code: 'CC-2026-00007',
      citizen_id: rameshId,
      category: 'Public Sanitation',
      dept: 'Sanitation Department',
      title: 'Uncleaned public toilet complex and water logging in Indira Market',
      description: 'Municipal public convenience at Indira Market is in an unhygienic state. Taps are broken, water is stagnating on the floor, and the stench is affecting shopkeepers and customers in the central shopping square.',
      address: 'Central Square, Indira Market, Gumanpura',
      landmark: 'Near Ghantaghar Clock Tower',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1764,
      lng: 75.8465,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      sla_hours_remaining: 16,
      support_count: 12,
      is_escalated: 0,
      days_ago: 3,
    },
    {
      code: 'CC-2026-00008',
      citizen_id: priyaId,
      category: 'Road Damage',
      dept: 'Road Infrastructure Department',
      title: 'Caved-in asphalt road section after water pipe repairs on Shastri Nagar Road',
      description: 'A 4-meter section of road subsided by nearly 8 inches following poorly compacted pipe trench repairs. Several vehicles have suffered axle damage.',
      address: 'Shastri Nagar Main Road, Dadabari',
      landmark: 'Near Shastri Park Community Hall',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1672,
      lng: 75.8236,
      priority: 'HIGH',
      status: 'ASSIGNED',
      sla_hours_remaining: 40,
      support_count: 31,
      is_escalated: 0,
      days_ago: 2,
    },
    {
      code: 'CC-2026-00009',
      citizen_id: rameshId,
      category: 'Other Civic Issues',
      dept: 'Electrical & Lighting Department',
      title: 'Large dangling banyan tree branch entangled with high-voltage 11kV lines',
      description: 'Storm winds cracked a massive tree limb that is resting directly on high-voltage power cables near Chawani Circle. Sparking observed during light drizzle.',
      address: 'Chawani Circle Main Roundabout',
      landmark: 'Opposite Central Post Office',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1712,
      lng: 75.8524,
      priority: 'CRITICAL',
      status: 'CLOSED',
      sla_hours_remaining: 0,
      support_count: 18,
      is_escalated: 0,
      days_ago: 7,
      resolution_notes: 'Forestry cutter team and electricity shutdown crew detached the tree branch safely. Power feeder restored without incident.',
      citizen_feedback: 'Inspected on-site. Tree limb has been completely chopped and safely removed. Excellent job.',
    },
    {
      code: 'CC-2026-00010',
      citizen_id: priyaId,
      category: 'Water Leakage',
      dept: 'Water Supply Board',
      title: 'Contaminated muddy tap water supply in Jawahar Nagar residential block',
      description: 'Residents across 4 lanes are receiving discolored brown water with heavy sediment. Potential cross-contamination between drinking water pipe and damaged municipal sewer line.',
      address: 'Block C, Jawahar Nagar',
      landmark: 'Near City Park Main Gate',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1565,
      lng: 75.8512,
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      sla_hours_remaining: 10,
      support_count: 53,
      is_escalated: 1,
      escalation_reason: 'Public health crisis risk. Over 50 households without potable water for 48 hours.',
      days_ago: 1,
    },
    {
      code: 'CC-2026-00011',
      citizen_id: rameshId,
      category: 'Other Civic Issues',
      dept: 'Sanitation Department',
      title: 'Accumulated construction debris and gravel blocking traffic on Baran Road',
      description: 'Several truckloads of stone dust and construction rubble have been dumped on the road margin, narrowing a four-lane road down to two lanes and generating dust clouds.',
      address: 'Baran Road, Borkhera',
      landmark: 'Near Overbridge Crossing',
      district: 'Kota',
      state: 'Rajasthan',
      lat: 25.1950,
      lng: 75.8810,
      priority: 'LOW',
      status: 'SUBMITTED',
      sla_hours_remaining: 90,
      support_count: 7,
      is_escalated: 0,
      days_ago: 1,
    },
  ];

  // Upsert sample complaints
  for (const c of sampleComplaints) {
    const existing = db.prepare('SELECT id FROM complaints WHERE complaint_code = ?').get(c.code);
    const catId = catMap[c.category];
    const deptId = deptMap[c.dept];
    const createdAt = new Date(Date.now() - c.days_ago * 86400000).toISOString();
    const slaDeadline = new Date(new Date(createdAt).getTime() + (c.sla_hours_remaining > 0 ? c.sla_hours_remaining + 48 : 48) * 3600000).toISOString();
    const resolvedAt = (c.status === 'RESOLVED' || c.status === 'CLOSED') ? new Date(Date.now() - 3600000 * 12).toISOString() : null;
    const closedAt = c.status === 'CLOSED' ? new Date().toISOString() : null;

    let complaintId = null;

    if (existing) {
      db.prepare(`
        UPDATE complaints
        SET title = ?, description = ?, address = ?, landmark = ?, district = ?, state = ?,
            latitude = ?, longitude = ?, priority = ?, status = ?, sla_deadline = ?,
            support_count = ?, is_escalated = ?, escalation_reason = ?, reopen_count = ?,
            category_id = ?, department_id = ?, citizen_id = ?
        WHERE id = ?
      `).run(
        c.title, c.description, c.address, c.landmark, c.district, c.state,
        c.lat, c.lng, c.priority, c.status, slaDeadline,
        c.support_count, c.is_escalated, c.escalation_reason || null, c.reopen_count || 0,
        catId, deptId, c.citizen_id, existing.id
      );
      complaintId = existing.id;
    } else {
      const info = db.prepare(`
        INSERT INTO complaints (
          complaint_code, citizen_id, category_id, department_id,
          title, description, address, landmark, district, state,
          latitude, longitude, priority, status, sla_deadline,
          support_count, is_escalated, escalation_reason, reopen_count, created_at, resolved_at, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        c.code, c.citizen_id, catId, deptId,
        c.title, c.description, c.address, c.landmark, c.district, c.state,
        c.lat, c.lng, c.priority, c.status, slaDeadline,
        c.support_count, c.is_escalated, c.escalation_reason || null, c.reopen_count || 0,
        createdAt, resolvedAt, closedAt
      );
      complaintId = info.lastInsertRowid;
    }

    // Insert or update status history
    const existingHist = db.prepare('SELECT id FROM complaint_status_history WHERE complaint_id = ?').all(complaintId);
    if (existingHist.length === 0) {
      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks, created_at)
        VALUES (?, NULL, 'SUBMITTED', ?, 'Complaint officially lodged by citizen.', ?)
      `).run(complaintId, c.citizen_id, createdAt);

      if (c.status !== 'SUBMITTED') {
        db.prepare(`
          INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks, created_at)
          VALUES (?, 'SUBMITTED', ?, ?, ?, ?)
        `).run(complaintId, c.status, adminId, `Status transitioned to ${c.status}`, new Date(Date.now() - c.days_ago * 43200000).toISOString());
      }
    }

    // Insert resolution evidence if resolved, reopened, or closed
    if (c.resolution_notes) {
      const existingEvidence = db.prepare('SELECT id FROM resolution_evidence WHERE complaint_id = ?').get(complaintId);
      const verifiedVal = c.status === 'CLOSED' ? 1 : c.status === 'REOPENED' ? -1 : 0;
      if (!existingEvidence) {
        db.prepare(`
          INSERT INTO resolution_evidence (
            complaint_id, admin_id, resolution_notes, verified_by_citizen, citizen_feedback, created_at, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          complaintId,
          adminId,
          c.resolution_notes,
          verifiedVal,
          c.citizen_feedback || null,
          new Date(Date.now() - 86400000).toISOString(),
          c.status === 'CLOSED' || c.status === 'REOPENED' ? new Date().toISOString() : null
        );
      }
    }
  }

  console.log('Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo accounts seeded. See README for access instructions.');
  console.log('Location Focus:     Kota, Rajasthan');
  console.log('Sequential IDs:     CC-2026-00001 through CC-2026-00011');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
