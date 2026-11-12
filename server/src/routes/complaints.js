const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateUploadedFiles } = require('../middleware/upload');
const { findDuplicates, haversineDistance } = require('../utils/duplicateDetector');
const { recommendPriority } = require('../utils/priorityRecommender');
const { calculateSlaDeadline, evaluateSla, isEligibleForEscalation } = require('../utils/slaEngine');
const { createNotification } = require('../utils/notifications');

/**
 * Generate sequential civic complaint tracking code: CC-YYYY-00001, CC-YYYY-00002...
 */
function generateComplaintCode() {
  const year = new Date().getFullYear();
  const prefix = `CC-${year}-`;

  // Find the highest sequence number in the database for the current year
  const lastRow = db.prepare(`
    SELECT complaint_code FROM complaints
    WHERE complaint_code LIKE ?
    ORDER BY id DESC
    LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastRow && lastRow.complaint_code) {
    const parts = lastRow.complaint_code.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  } else {
    const countRow = db.prepare('SELECT COUNT(*) AS count FROM complaints').get();
    nextSeq = (countRow ? countRow.count : 0) + 1;
  }

  // Ensure uniqueness in case of race condition or gaps
  let candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;
  while (db.prepare('SELECT 1 FROM complaints WHERE complaint_code = ?').get(candidate)) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  return candidate;
}

/**
 * GET /api/complaints/categories
 * Returns active categories with their assigned default department
 */
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, d.name AS default_department_name
      FROM categories c
      LEFT JOIN departments d ON c.default_department_id = d.id
      ORDER BY c.id ASC
    `).all();
    return res.json({ success: true, categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch issue categories.' });
  }
});

/**
 * POST /api/complaints/check-duplicate
 * Checks existing complaints for potential duplicates based on category, text similarity, and proximity
 */
router.post('/check-duplicate', optionalAuth, (req, res) => {
  try {
    const { category_id, title, description, latitude, longitude } = req.body;

    if (!category_id || !title) {
      return res.status(400).json({ success: false, message: 'Category and title are required for duplicate check.' });
    }

    // Fetch recent/active complaints
    const existing = db.prepare(`
      SELECT c.id, c.complaint_code, c.category_id, c.title, c.description,
             c.address, c.landmark, c.district, c.latitude, c.longitude,
             c.status, c.priority, c.support_count, c.created_at,
             cat.name AS category_name
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.status != 'CLOSED'
      ORDER BY c.created_at DESC
      LIMIT 100
    `).all();

    const matches = findDuplicates(
      {
        category_id,
        title,
        description,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      existing,
      0.35 // 35% similarity threshold
    );

    return res.json({
      success: true,
      hasDuplicates: matches.length > 0,
      count: matches.length,
      matches: matches.slice(0, 5), // top 5 most relevant
    });
  } catch (err) {
    console.error('Duplicate check error:', err);
    return res.status(500).json({ success: false, message: 'Could not perform duplicate check.' });
  }
});

/**
 * POST /api/complaints
 * Submit a new civic complaint (Multipart form with photos)
 */
router.post('/', authenticateToken, upload.array('photos', 5), validateUploadedFiles, (req, res) => {
  try {
    const {
      category_id,
      title,
      description,
      address,
      locality,
      city,
      pincode,
      landmark,
      district,
      state,
      latitude,
      longitude,
      ward,
      location_source,
      related_complaint_id,
      local_body,
      local_body_id,
      local_body_type,
      ward_village,
    } = req.body;

    // Validation
    if (!category_id || !title || !description || !address || !district || !state) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, description, address, district, and state are required fields.',
      });
    }

    // Input length and content validation
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedAddr = address.trim();

    if (trimmedTitle.length < 10 || trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 10 and 200 characters.',
      });
    }
    if (trimmedDesc.length < 20 || trimmedDesc.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description must be between 20 and 2000 characters.',
      });
    }
    if (trimmedAddr.length < 5 || trimmedAddr.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Address must be between 5 and 500 characters.',
      });
    }

    // Basic HTML/script tag stripping for stored text fields (XSS prevention)
    const sanitize = (str) => str.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');

    // Verify category exists
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist.' });
    }

    let latVal = latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    let lngVal = longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

    // Validate coordinate range if provided
    if (latVal !== null && (latVal < -90 || latVal > 90)) {
      return res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90 degrees.' });
    }
    if (lngVal !== null && (lngVal < -180 || lngVal > 180)) {
      return res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180 degrees.' });
    }

    // Sanitize location source (default to MANUAL if unrecognized)
    const validSources = ['GPS', 'MAP_PIN', 'SEARCH', 'MANUAL'];
    const safeLocationSource = validSources.includes(location_source) ? location_source : (latVal && lngVal ? 'MAP_PIN' : 'MANUAL');

    // Transparent Priority Recommendation
    const priorityAnalysis = recommendPriority({
      categoryName: category.name,
      title,
      description,
      supportCount: 0,
      hoursSinceReported: 0,
    });

    const assignedPriority = priorityAnalysis.recommendedPriority || category.default_priority || 'MEDIUM';

    // Calculate SLA Deadline
    const slaDeadline = calculateSlaDeadline(new Date(), assignedPriority);

    // Generate unique complaint code
    let complaintCode;
    let isCodeUnique = false;
    while (!isCodeUnique) {
      complaintCode = generateComplaintCode();
      const existing = db.prepare('SELECT id FROM complaints WHERE complaint_code = ?').get(complaintCode);
      if (!existing) isCodeUnique = true;
    }

    // Insert complaint within transaction
    const insertTransaction = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO complaints (
          complaint_code, citizen_id, category_id, department_id,
          title, description, address, landmark, district, state,
          latitude, longitude, priority, status, sla_deadline, ward,
          pincode, locality, city, location_source, local_body, local_body_id,
          local_body_type, ward_village, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const result = insertStmt.run(
        complaintCode,
        req.user.id,
        category.id,
        category.default_department_id || null,
        sanitize(trimmedTitle),
        sanitize(trimmedDesc),
        sanitize(trimmedAddr),
        landmark ? sanitize(landmark.trim()) : null,
        district.trim(),
        state.trim(),
        latVal,
        lngVal,
        assignedPriority,
        slaDeadline,
        ward ? ward.trim() : null,
        pincode ? pincode.trim().slice(0, 6) : null,
        locality ? sanitize(locality.trim()) : null,
        city ? sanitize(city.trim()) : null,
        safeLocationSource,
        local_body ? sanitize(local_body.trim()) : null,
        local_body_id ? parseInt(local_body_id, 10) : null,
        local_body_type ? sanitize(local_body_type.trim()) : null,
        ward_village ? sanitize(ward_village.trim()) : (ward ? ward.trim() : null)
      );

      const complaintId = result.lastInsertRowid;

      // Save uploaded images
      if (req.files && req.files.length > 0) {
        const imageStmt = db.prepare(`
          INSERT INTO complaint_images (complaint_id, file_url, file_name, file_size, mime_type)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const file of req.files) {
          const fileUrl = `/uploads/${file.filename}`;
          imageStmt.run(complaintId, fileUrl, file.originalname, file.size, file.mimetype);
        }
      }

      // Initial status audit history
      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES (?, NULL, 'SUBMITTED', ?, 'Complaint officially lodged by citizen.')
      `).run(complaintId, req.user.id);

      // Link duplicate if citizen specified related issue
      if (related_complaint_id) {
        db.prepare(`
          INSERT INTO duplicate_relations (primary_complaint_id, duplicate_complaint_id, similarity_reason)
          VALUES (?, ?, 'Associated with related citizen report')
        `).run(related_complaint_id, complaintId);
      }

      // Dispatch citizen notification
      createNotification({
        userId: req.user.id,
        title: 'Complaint Lodged Successfully',
        message: `Your complaint has been submitted under tracking ID ${complaintCode}. Our municipal team will review it shortly.`,
        type: 'STATUS_CHANGE',
        complaintId,
      });

      return complaintId;
    });

    const newId = insertTransaction();

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully!',
      complaint: {
        id: newId,
        complaint_code: complaintCode,
        priority: assignedPriority,
        sla_deadline: slaDeadline,
        priorityRecommendation: priorityAnalysis,
      },
    });
  } catch (err) {
    console.error('Complaint submission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to lodge complaint. Please try again.' });
  }
});

/**
 * GET /api/complaints
 * Public exploration endpoint with filters, search, and nearby location calculation
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const {
      category_id,
      status,
      priority,
      district,
      state,
      city,
      locality,
      pincode,
      is_demo,
      search,
      nearby_lat,
      nearby_lng,
      radius_km = 15,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    let whereClauses = [];

    if (category_id) {
      whereClauses.push('c.category_id = ?');
      params.push(category_id);
    }

    if (status) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    if (priority) {
      whereClauses.push('c.priority = ?');
      params.push(priority);
    }

    if (state) {
      whereClauses.push('LOWER(c.state) = LOWER(?)');
      params.push(state.trim());
    }

    if (district) {
      whereClauses.push('LOWER(c.district) = LOWER(?)');
      params.push(district.trim());
    }

    if (city) {
      whereClauses.push('(LOWER(c.city) = LOWER(?) OR LOWER(c.district) = LOWER(?))');
      params.push(city.trim(), city.trim());
    }

    if (locality) {
      whereClauses.push('LOWER(c.locality) LIKE LOWER(?)');
      params.push(`%${locality.trim()}%`);
    }

    if (pincode) {
      whereClauses.push('c.pincode = ?');
      params.push(pincode.trim());
    }

    if (is_demo !== undefined) {
      whereClauses.push('c.is_demo = ?');
      params.push(is_demo === 'true' || is_demo === '1' ? 1 : 0);
    }

    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.description LIKE ? OR c.address LIKE ? OR c.complaint_code LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.complaint_code, c.category_id, c.department_id,
             c.title, c.description, c.address, c.landmark, c.district, c.state,
             c.latitude, c.longitude, c.priority, c.status, c.sla_deadline,
             c.support_count, c.is_escalated, c.reopen_count, c.ward,
             c.pincode, c.locality, c.city, c.location_source, c.is_demo, c.created_at,
             cat.name AS category_name, cat.icon AS category_icon,
             d.name AS department_name,
             (SELECT file_url FROM complaint_images WHERE complaint_id = c.id LIMIT 1) AS primary_image_url
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const complaints = db.prepare(query).all(...params, parseInt(limit, 10), offset);

    // Compute SLA indicators, distance, and whether authenticated citizen has supported
    const userSupports = req.user
      ? new Set(db.prepare('SELECT complaint_id FROM complaint_supports WHERE citizen_id = ?').all(req.user.id).map(s => s.complaint_id))
      : new Set();

    const enrichedComplaints = complaints.map(c => {
      const sla = evaluateSla(c);
      let distanceMeters = null;

      if (nearby_lat && nearby_lng && c.latitude != null && c.longitude != null) {
        distanceMeters = haversineDistance(
          parseFloat(nearby_lat),
          parseFloat(nearby_lng),
          c.latitude,
          c.longitude
        );
      }

      return {
        ...c,
        sla,
        distanceMeters,
        hasSupported: userSupports.has(c.id),
      };
    });

    // If nearby filter is requested with radius, filter by radius
    let results = enrichedComplaints;
    if (nearby_lat && nearby_lng && radius_km) {
      const maxDistanceMeters = parseFloat(radius_km) * 1000;
      results = results.filter(c => c.distanceMeters == null || c.distanceMeters <= maxDistanceMeters);
    }

    const totalCount = db.prepare(`SELECT COUNT(*) AS count FROM complaints c ${whereSql}`).get(...params).count;

    return res.json({
      success: true,
      total: totalCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      complaints: results,
    });
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch complaints.' });
  }
});

/**
 * GET /api/complaints/my
 * Citizen's own lodged complaints with status metrics
 */
router.get('/my', authenticateToken, (req, res) => {
  try {
    const complaints = db.prepare(`
      SELECT c.*,
             cat.name AS category_name, cat.icon AS category_icon,
             d.name AS department_name,
             (SELECT file_url FROM complaint_images WHERE complaint_id = c.id LIMIT 1) AS primary_image_url
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.citizen_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    // Compute genuine metrics directly from database records
    const metrics = {
      total: complaints.length,
      pending: complaints.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length,
      inProgress: complaints.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
      resolved: complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
      reopened: complaints.filter(c => c.status === 'REOPENED').length,
    };

    const enriched = complaints.map(c => ({
      ...c,
      sla: evaluateSla(c),
      escalationEligibility: isEligibleForEscalation(c),
    }));

    return res.json({
      success: true,
      metrics,
      complaints: enriched,
    });
  } catch (err) {
    console.error('Error fetching citizen complaints:', err);
    return res.status(500).json({ success: false, message: 'Could not load your complaints.' });
  }
});

/**
 * GET /api/complaints/track/:code
 * Dedicated tracking route by complaint ID
 */
router.get('/track/:code', optionalAuth, (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();

    const complaint = db.prepare(`
      SELECT c.*,
             cat.name AS category_name, cat.icon AS category_icon,
             d.name AS department_name, d.contact_phone AS department_phone, d.contact_email AS department_email
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE UPPER(c.complaint_code) = ?
    `).get(code);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `No complaint found matching tracking code "${code}". Please verify the code.`,
      });
    }

    // Fetch images
    const images = db.prepare('SELECT id, file_url, file_name, uploaded_at FROM complaint_images WHERE complaint_id = ?').all(complaint.id);

    // Fetch status history timeline
    const history = db.prepare(`
      SELECT h.*, u.name AS updated_by_name, u.role AS updated_by_role
      FROM complaint_status_history h
      LEFT JOIN users u ON h.changed_by_user_id = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.created_at ASC
    `).all(complaint.id);

    // Fetch resolution evidence if available
    const resolutionEvidence = db.prepare(`
      SELECT r.*, u.name AS resolved_by_officer
      FROM resolution_evidence r
      JOIN users u ON r.admin_id = u.id
      WHERE r.complaint_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1
    `).get(complaint.id);

    // Check if authenticated user is the author
    const isOwner = req.user ? req.user.id === complaint.citizen_id : false;

    // Check support state
    const hasSupported = req.user
      ? Boolean(db.prepare('SELECT 1 FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').get(complaint.id, req.user.id))
      : false;

    // Mask sensitive author info for public viewers
    const publicComplaint = {
      ...complaint,
      citizen_id: isOwner ? complaint.citizen_id : undefined, // hidden from public
      sla: evaluateSla(complaint),
      escalationEligibility: isEligibleForEscalation(complaint),
      images,
      timeline: history,
      resolutionEvidence: resolutionEvidence || null,
      isOwner,
      hasSupported,
    };

    return res.json({
      success: true,
      complaint: publicComplaint,
    });
  } catch (err) {
    console.error('Tracking lookup error:', err);
    return res.status(500).json({ success: false, message: 'Could not retrieve tracking details.' });
  }
});

/**
 * GET /api/complaints/:id
 * Fetch single complaint by internal ID
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const complaint = db.prepare(`
      SELECT c.*,
             cat.name AS category_name, cat.icon AS category_icon,
             d.name AS department_name
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `).get(id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const images = db.prepare('SELECT * FROM complaint_images WHERE complaint_id = ?').all(id);
    const history = db.prepare(`
      SELECT h.*, u.name AS updated_by_name, u.role AS updated_by_role
      FROM complaint_status_history h
      LEFT JOIN users u ON h.changed_by_user_id = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.created_at ASC
    `).all(id);

    const resolutionEvidence = db.prepare(`
      SELECT r.*, u.name AS resolved_by_officer
      FROM resolution_evidence r
      JOIN users u ON r.admin_id = u.id
      WHERE r.complaint_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1
    `).get(id);

    const isOwner = req.user ? req.user.id === complaint.citizen_id : false;
    const hasSupported = req.user
      ? Boolean(db.prepare('SELECT 1 FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').get(id, req.user.id))
      : false;

    return res.json({
      success: true,
      complaint: {
        ...complaint,
        sla: evaluateSla(complaint),
        escalationEligibility: isEligibleForEscalation(complaint),
        images,
        timeline: history,
        resolutionEvidence: resolutionEvidence || null,
        isOwner,
        hasSupported,
      },
    });
  } catch (err) {
    console.error('Error fetching complaint:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch complaint.' });
  }
});

/**
 * POST /api/complaints/:id/support
 * Add community support for a complaint
 */
router.post('/:id/support', authenticateToken, (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const citizenId = req.user.id;

    const complaint = db.prepare('SELECT id, citizen_id, support_count, status FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Check if already supported
    const existing = db.prepare('SELECT 1 FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').get(complaintId, citizenId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already lent your support to this complaint.' });
    }

    db.transaction(() => {
      db.prepare('INSERT INTO complaint_supports (complaint_id, citizen_id) VALUES (?, ?)').run(complaintId, citizenId);
      db.prepare('UPDATE complaints SET support_count = support_count + 1 WHERE id = ?').run(complaintId);

      // Notify the complaint owner that a fellow citizen supported their issue
      if (complaint.citizen_id !== citizenId) {
        createNotification({
          userId: complaint.citizen_id,
          title: 'Community Support Received',
          message: 'Another community member supported your civic complaint, increasing its priority and visibility.',
          type: 'STATUS_CHANGE',
          complaintId,
        });
      }
    })();

    const updated = db.prepare('SELECT support_count FROM complaints WHERE id = ?').get(complaintId);

    return res.json({
      success: true,
      message: 'Thank you for supporting this civic complaint!',
      supportCount: updated.support_count,
      hasSupported: true,
    });
  } catch (err) {
    console.error('Support error:', err);
    return res.status(500).json({ success: false, message: 'Could not record support.' });
  }
});

/**
 * DELETE /api/complaints/:id/support
 * Remove community support
 */
router.delete('/:id/support', authenticateToken, (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const citizenId = req.user.id;

    const existing = db.prepare('SELECT 1 FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').get(complaintId, citizenId);
    if (!existing) {
      return res.status(400).json({ success: false, message: 'You have not supported this complaint.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM complaint_supports WHERE complaint_id = ? AND citizen_id = ?').run(complaintId, citizenId);
      db.prepare('UPDATE complaints SET support_count = MAX(0, support_count - 1) WHERE id = ?').run(complaintId);
    })();

    const updated = db.prepare('SELECT support_count FROM complaints WHERE id = ?').get(complaintId);

    return res.json({
      success: true,
      message: 'Support removed.',
      supportCount: updated.support_count,
      hasSupported: false,
    });
  } catch (err) {
    console.error('Remove support error:', err);
    return res.status(500).json({ success: false, message: 'Could not remove support.' });
  }
});

/**
 * POST /api/complaints/:id/escalate
 * Citizen escalation request
 */
router.post('/:id/escalate', authenticateToken, (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear reason for escalating this complaint (minimum 10 characters).',
      });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Only owner can escalate
    if (complaint.citizen_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the citizen who lodged this complaint can escalate it.' });
    }

    const eligibility = isEligibleForEscalation(complaint);
    if (!eligibility.eligible && req.user.role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE complaints
        SET is_escalated = 1,
            escalation_reason = ?,
            priority = CASE WHEN priority = 'LOW' THEN 'HIGH' ELSE 'CRITICAL' END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason.trim(), complaintId);

      db.prepare(`
        INSERT INTO escalation_records (complaint_id, citizen_id, reason)
        VALUES (?, ?, ?)
      `).run(complaintId, req.user.id, reason.trim());

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        complaintId,
        complaint.status,
        complaint.status,
        req.user.id,
        `ESCALATION FILED: ${reason.trim()} (Priority escalated)`
      );

      // Notification
      createNotification({
        userId: complaint.citizen_id,
        title: 'Complaint Escalated to Municipal Supervisors',
        message: `Your escalation for ${complaint.complaint_code} has been logged. Senior administrative supervisors have been alerted.`,
        type: 'ESCALATION',
        complaintId,
      });
    })();

    return res.json({
      success: true,
      message: 'Complaint has been escalated successfully. Senior administrative personnel have been notified.',
    });
  } catch (err) {
    console.error('Escalation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record escalation request.' });
  }
});

/**
 * POST /api/complaints/:id/verify-resolution
 * Citizen reviews evidence: Confirm Resolution or Report Unresolved
 */
router.post('/:id/verify-resolution', authenticateToken, (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { action, feedback } = req.body; // action: 'CONFIRM' or 'UNRESOLVED'

    if (!['CONFIRM', 'UNRESOLVED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be CONFIRM or UNRESOLVED.' });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (complaint.citizen_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the citizen who lodged this complaint can verify resolution.' });
    }

    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({
        success: false,
        message: 'This complaint is not currently marked as resolved and awaiting verification.',
      });
    }

    if (action === 'CONFIRM') {
      // Citizen confirms resolution -> moves to CLOSED
      db.transaction(() => {
        db.prepare(`
          UPDATE complaints
          SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(complaintId);

        db.prepare(`
          UPDATE resolution_evidence
          SET verified_by_citizen = 1, citizen_feedback = ?, verified_at = CURRENT_TIMESTAMP
          WHERE complaint_id = ?
        `).run(feedback || 'Resolution verified and accepted by citizen.', complaintId);

        db.prepare(`
          INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
          VALUES (?, 'RESOLVED', 'CLOSED', ?, ?)
        `).run(complaintId, req.user.id, `Citizen verified and closed: ${feedback || 'Satisfactory resolution'}`);

        createNotification({
          userId: req.user.id,
          title: 'Complaint Closed & Confirmed',
          message: `Thank you for confirming resolution for ${complaint.complaint_code}. This case is now officially closed.`,
          type: 'STATUS_CHANGE',
          complaintId,
        });
      })();

      return res.json({
        success: true,
        message: 'Thank you! The complaint has been officially closed.',
        status: 'CLOSED',
      });
    } else {
      // Citizen reports unresolved -> REOPEN
      if (!feedback || feedback.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please explain why the resolution was unsatisfactory so authorities can address it properly (min 10 characters).',
        });
      }

      db.transaction(() => {
        db.prepare(`
          UPDATE complaints
          SET status = 'REOPENED',
              reopen_count = reopen_count + 1,
              priority = 'HIGH',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(complaintId);

        db.prepare(`
          UPDATE resolution_evidence
          SET verified_by_citizen = -1, citizen_feedback = ?, verified_at = CURRENT_TIMESTAMP
          WHERE complaint_id = ?
        `).run(feedback.trim(), complaintId);

        db.prepare(`
          INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
          VALUES (?, 'RESOLVED', 'REOPENED', ?, ?)
        `).run(complaintId, req.user.id, `REOPENED BY CITIZEN: ${feedback.trim()}`);

        createNotification({
          userId: req.user.id,
          title: 'Complaint Reopened',
          message: `Your complaint ${complaint.complaint_code} has been reopened with priority HIGH. Authorities have been alerted to re-inspect.`,
          type: 'STATUS_CHANGE',
          complaintId,
        });
      })();

      return res.json({
        success: true,
        message: 'The complaint has been reopened and prioritized for administrative re-inspection.',
        status: 'REOPENED',
      });
    }
  } catch (err) {
    console.error('Resolution verification error:', err);
    return res.status(500).json({ success: false, message: 'Could not process resolution verification.' });
  }
});

module.exports = router;
