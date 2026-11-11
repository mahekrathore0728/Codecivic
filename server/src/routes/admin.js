const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { evaluateSla, calculateSlaDeadline } = require('../utils/slaEngine');
const { detectRecurringIssues } = require('../utils/recurringDetector');
const { createNotification } = require('../utils/notifications');

// Enforce ADMIN role for all routes in this router
router.use(authenticateToken, requireRole('ADMIN'));

/**
 * GET /api/admin/dashboard
 * Aggregates live statistical data from actual database records
 */
router.get('/dashboard', (req, res) => {
  try {
    const allComplaints = db.prepare(`
      SELECT c.id, c.status, c.priority, c.sla_deadline, c.created_at, c.resolved_at
      FROM complaints c
    `).all();

    let total = allComplaints.length;
    let submitted = 0;
    let underReview = 0;
    let assigned = 0;
    let inProgress = 0;
    let resolved = 0;
    let reopened = 0;
    let closed = 0;
    let overdueCount = 0;

    for (const c of allComplaints) {
      if (c.status === 'SUBMITTED') submitted++;
      else if (c.status === 'UNDER_REVIEW') underReview++;
      else if (c.status === 'ASSIGNED') assigned++;
      else if (c.status === 'IN_PROGRESS') inProgress++;
      else if (c.status === 'RESOLVED') resolved++;
      else if (c.status === 'REOPENED') reopened++;
      else if (c.status === 'CLOSED') closed++;

      const sla = evaluateSla(c);
      if (sla.isOverdue && !['RESOLVED', 'CLOSED'].includes(c.status)) {
        overdueCount++;
      }
    }

    const totalCitizens = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'CITIZEN'").get().count;
    const totalDepartments = db.prepare('SELECT COUNT(*) AS count FROM departments').get().count;

    // Recent complaints
    const recentComplaints = db.prepare(`
      SELECT c.id, c.complaint_code, c.title, c.district, c.status, c.priority, c.created_at,
             cat.name AS category_name,
             u.name AS citizen_name
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      JOIN users u ON c.citizen_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 8
    `).all();

    // Recent admin activity logs
    const activityLogs = db.prepare(`
      SELECT l.*, u.name AS admin_name
      FROM admin_activity_logs l
      JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `).all();

    return res.json({
      success: true,
      stats: {
        total,
        pending: submitted + underReview,
        underReview,
        assigned,
        inProgress,
        resolved,
        reopened,
        closed,
        overdueCount,
        totalCitizens,
        totalDepartments,
      },
      recentComplaints: recentComplaints.map(c => ({
        ...c,
        sla: evaluateSla(c),
      })),
      activityLogs,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Could not generate admin dashboard statistics.' });
  }
});

/**
 * GET /api/admin/complaints
 * Comprehensive complaints management table with filters
 */
router.get('/complaints', (req, res) => {
  try {
    const {
      category_id,
      department_id,
      status,
      priority,
      state,
      district,
      city,
      locality,
      is_demo,
      search,
      is_overdue,
      is_escalated,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClauses = [];
    const params = [];

    if (category_id) {
      whereClauses.push('c.category_id = ?');
      params.push(category_id);
    }

    if (department_id) {
      whereClauses.push('c.department_id = ?');
      params.push(department_id);
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

    if (is_demo !== undefined) {
      whereClauses.push('c.is_demo = ?');
      params.push(is_demo === 'true' || is_demo === '1' ? 1 : 0);
    }

    if (is_escalated === 'true' || is_escalated === '1') {
      whereClauses.push('c.is_escalated = 1');
    }

    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.description LIKE ? OR c.complaint_code LIKE ? OR u.name LIKE ? OR c.address LIKE ?)');
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT c.*,
             cat.name AS category_name, cat.icon AS category_icon,
             d.name AS department_name,
             u.name AS citizen_name, u.email AS citizen_email, u.mobile AS citizen_mobile,
             (SELECT COUNT(*) FROM complaint_images WHERE complaint_id = c.id) AS image_count
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereSql}
      ORDER BY 
        CASE c.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const complaints = db.prepare(query).all(...params, parseInt(limit, 10), offset);

    let enriched = complaints.map(c => ({
      ...c,
      sla: evaluateSla(c),
    }));

    if (is_overdue === 'true' || is_overdue === '1') {
      enriched = enriched.filter(c => c.sla.isOverdue && !['RESOLVED', 'CLOSED'].includes(c.status));
    }

    const totalCount = db.prepare(`
      SELECT COUNT(*) AS count 
      FROM complaints c 
      JOIN users u ON c.citizen_id = u.id 
      ${whereSql}
    `).get(...params).count;

    return res.json({
      success: true,
      total: totalCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      complaints: enriched,
    });
  } catch (err) {
    console.error('Admin complaints fetch error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch complaints for management.' });
  }
});

/**
 * Valid status transition matrix.
 * Prevents arbitrary status changes. Each key lists the statuses it can transition TO.
 */
const VALID_STATUS_TRANSITIONS = {
  SUBMITTED:    ['UNDER_REVIEW', 'ASSIGNED', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED', 'SUBMITTED'],
  ASSIGNED:     ['IN_PROGRESS', 'UNDER_REVIEW'],
  IN_PROGRESS:  ['RESOLVED', 'ASSIGNED'],
  RESOLVED:     ['CLOSED'],          // Only citizen verification should close; admin fallback allowed
  REOPENED:     ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'],
  CLOSED:       [],                   // Terminal state — cannot revert
  REJECTED:     ['UNDER_REVIEW'],     // Can be reconsidered
};

/**
 * PATCH /api/admin/complaints/:id/status
 * Update complaint status with administrative remarks and strict transition validation
 */
router.patch('/complaints/:id/status', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required.' });
    }

    const allStatuses = Object.keys(VALID_STATUS_TRANSITIONS);
    if (!allStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status "${status}". Valid statuses: ${allStatuses.join(', ')}` });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const previousStatus = complaint.status;

    // Enforce valid transition
    const allowedNext = VALID_STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: "${previousStatus}" → "${status}" is not permitted. Allowed transitions from "${previousStatus}": ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'}`,
      });
    }

    // Prevent CLOSED without resolution evidence
    if (status === 'CLOSED') {
      const evidence = db.prepare('SELECT id FROM resolution_evidence WHERE complaint_id = ?').get(id);
      if (!evidence) {
        return res.status(400).json({
          success: false,
          message: 'Cannot close a complaint without resolution evidence. Please resolve the complaint with evidence first.',
        });
      }
    }

    db.transaction(() => {
      let resolvedAt = complaint.resolved_at;
      let closedAt = complaint.closed_at;

      if (status === 'RESOLVED' && !resolvedAt) resolvedAt = new Date().toISOString();
      if (status === 'CLOSED' && !closedAt) closedAt = new Date().toISOString();

      db.prepare(`
        UPDATE complaints
        SET status = ?, resolved_at = ?, closed_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, resolvedAt, closedAt, id);

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, previousStatus, status, req.user.id, remarks || `Status changed by Administrator (${req.user.name})`);

      db.prepare(`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details)
        VALUES (?, 'UPDATE_STATUS', 'COMPLAINT', ?, ?)
      `).run(req.user.id, id, `Status moved from ${previousStatus} to ${status}. Remarks: ${remarks || 'None'}`);

      createNotification({
        userId: complaint.citizen_id,
        title: `Complaint Status Updated: ${status.replace('_', ' ')}`,
        message: `Your complaint (${complaint.complaint_code}) has been updated to "${status.replace('_', ' ')}". Remarks: ${remarks || 'No remarks provided.'}`,
        type: 'STATUS_CHANGE',
        complaintId: id,
      });
    })();

    return res.json({
      success: true,
      message: `Complaint status updated from ${previousStatus} to ${status} successfully.`,
      previousStatus,
      status,
    });
  } catch (err) {
    console.error('Status update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
  }
});

/**
 * PATCH /api/admin/complaints/:id/assign
 * Assign complaint to a department and adjust priority
 */
router.patch('/complaints/:id/assign', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { department_id, priority, remarks } = req.body;

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const dept = department_id ? db.prepare('SELECT * FROM departments WHERE id = ?').get(department_id) : null;
    const newPriority = priority || complaint.priority;

    // Recalculate SLA if priority changed
    let newSla = complaint.sla_deadline;
    if (newPriority !== complaint.priority) {
      newSla = calculateSlaDeadline(complaint.created_at, newPriority, dept ? dept.sla_hours_default : null);
    }

    const newStatus = complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW' ? 'ASSIGNED' : complaint.status;

    db.transaction(() => {
      db.prepare(`
        UPDATE complaints
        SET department_id = ?, priority = ?, status = ?, sla_deadline = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(department_id || complaint.department_id, newPriority, newStatus, newSla, id);

      const deptName = dept ? dept.name : 'Unassigned';
      const historyRemarks = `Assigned to ${deptName} with priority ${newPriority}. ${remarks || ''}`.trim();

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, complaint.status, newStatus, req.user.id, historyRemarks);

      db.prepare(`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details)
        VALUES (?, 'ASSIGN_DEPARTMENT', 'COMPLAINT', ?, ?)
      `).run(req.user.id, id, `Assigned to ${deptName}, Priority set to ${newPriority}`);

      createNotification({
        userId: complaint.citizen_id,
        title: 'Department Assigned',
        message: `Your complaint (${complaint.complaint_code}) has been assigned to ${deptName} with priority "${newPriority}".`,
        type: 'ASSIGNMENT',
        complaintId: id,
      });
    })();

    return res.json({
      success: true,
      message: 'Department assignment and priority updated.',
    });
  } catch (err) {
    console.error('Assignment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign complaint.' });
  }
});

/**
 * POST /api/admin/complaints/:id/resolve
 * Mark complaint as resolved with mandatory evidence description & optional photographic proof
 */
router.post('/complaints/:id/resolve', upload.single('evidence_image'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { resolution_notes } = req.body;

    if (!resolution_notes || resolution_notes.trim().length < 15) {
      return res.status(400).json({
        success: false,
        message: 'A detailed resolution description (minimum 15 characters) is required as evidence.',
      });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const evidenceImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.transaction(() => {
      // Record resolution evidence
      db.prepare(`
        INSERT INTO resolution_evidence (
          complaint_id, admin_id, resolution_notes, evidence_image_url, verified_by_citizen
        ) VALUES (?, ?, ?, ?, 0)
      `).run(id, req.user.id, resolution_notes.trim(), evidenceImageUrl);

      // Update complaint status to RESOLVED
      db.prepare(`
        UPDATE complaints
        SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      // Add status history
      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES (?, ?, 'RESOLVED', ?, ?)
      `).run(id, complaint.status, req.user.id, `Resolution lodged with evidence: ${resolution_notes.trim()}`);

      // Log admin action
      db.prepare(`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details)
        VALUES (?, 'RESOLVE_COMPLAINT', 'COMPLAINT', ?, ?)
      `).run(req.user.id, id, `Resolved with evidence: ${resolution_notes.trim()}`);

      // Notify citizen to review and verify resolution
      createNotification({
        userId: complaint.citizen_id,
        title: 'Issue Resolved - Action Required',
        message: `Authorities have marked your complaint (${complaint.complaint_code}) as resolved with evidence. Please review and confirm resolution.`,
        type: 'RESOLUTION_VERIFICATION',
        complaintId: id,
      });
    })();

    return res.json({
      success: true,
      message: 'Resolution evidence successfully recorded. Citizen has been notified to verify.',
      status: 'RESOLVED',
    });
  } catch (err) {
    console.error('Resolve error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record resolution.' });
  }
});

/**
 * GET /api/admin/departments
 * List municipal departments with complaint load metrics
 */
router.get('/departments', (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT d.*,
             COUNT(c.id) AS total_assigned,
             SUM(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS active_count,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id
      ORDER BY d.id ASC
    `).all();

    return res.json({ success: true, departments });
  } catch (err) {
    console.error('Departments error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch departments.' });
  }
});

/**
 * POST /api/admin/departments
 * Create new municipal department
 */
router.post('/departments', (req, res) => {
  try {
    const { name, description, contact_email, contact_phone, head_officer, sla_hours_default } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const existing = db.prepare('SELECT id FROM departments WHERE name = ? COLLATE NOCASE').get(name.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'A department with this name already exists.' });
    }

    const stmt = db.prepare(`
      INSERT INTO departments (name, description, contact_email, contact_phone, head_officer, sla_hours_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      description ? description.trim() : null,
      contact_email ? contact_email.trim() : null,
      contact_phone ? contact_phone.trim() : null,
      head_officer ? head_officer.trim() : null,
      parseInt(sla_hours_default, 10) || 72
    );

    return res.status(201).json({
      success: true,
      message: 'Department registered successfully.',
      departmentId: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Department creation error:', err);
    return res.status(500).json({ success: false, message: 'Could not create department.' });
  }
});

/**
 * PUT /api/admin/departments/:id
 * Update existing department
 */
router.put('/departments/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, contact_email, contact_phone, head_officer, sla_hours_default } = req.body;

    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    db.prepare(`
      UPDATE departments
      SET name = ?, description = ?, contact_email = ?, contact_phone = ?, head_officer = ?, sla_hours_default = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : dept.name,
      description !== undefined ? description.trim() : dept.description,
      contact_email !== undefined ? contact_email.trim() : dept.contact_email,
      contact_phone !== undefined ? contact_phone.trim() : dept.contact_phone,
      head_officer !== undefined ? head_officer.trim() : dept.head_officer,
      parseInt(sla_hours_default, 10) || dept.sla_hours_default,
      id
    );

    return res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    console.error('Department update error:', err);
    return res.status(500).json({ success: false, message: 'Could not update department.' });
  }
});

/**
 * GET /api/admin/recurring-issues
 * Identifies spatial and categorical recurring complaint clusters
 */
router.get('/recurring-issues', (req, res) => {
  try {
    const complaints = db.prepare(`
      SELECT c.*, cat.name AS category_name
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
    `).all();

    const hotspots = detectRecurringIssues(complaints);

    return res.json({
      success: true,
      count: hotspots.length,
      hotspots,
    });
  } catch (err) {
    console.error('Recurring issues error:', err);
    return res.status(500).json({ success: false, message: 'Could not compute recurring issue hotspots.' });
  }
});

/**
 * GET /api/admin/analytics
 * Comprehensive civic governance analytics and trends with multidimensional filtering
 */
router.get('/analytics', (req, res) => {
  try {
    const {
      startDate,
      endDate,
      ward,
      state,
      district,
      department_id,
      category_id,
      priority,
      status
    } = req.query;

    const whereClauses = [];
    const params = [];

    if (startDate) {
      whereClauses.push("c.created_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push("c.created_at <= ?");
      params.push(endDate);
    }
    if (state) {
      whereClauses.push("LOWER(c.state) = LOWER(?)");
      params.push(state.trim());
    }
    if (district) {
      whereClauses.push("LOWER(c.district) = LOWER(?)");
      params.push(district.trim());
    }
    if (ward) {
      whereClauses.push("c.ward = ?");
      params.push(ward);
    }
    if (department_id) {
      whereClauses.push("c.department_id = ?");
      params.push(department_id);
    }
    if (category_id) {
      whereClauses.push("c.category_id = ?");
      params.push(category_id);
    }
    if (priority) {
      whereClauses.push("c.priority = ?");
      params.push(priority);
    }
    if (status) {
      whereClauses.push("c.status = ?");
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Category distribution with active filters
    const categoryCounts = db.prepare(`
      SELECT cat.id, cat.name, COUNT(c.id) AS count, cat.icon
      FROM categories cat
      LEFT JOIN complaints c ON cat.id = c.category_id ${whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ') : ''}
      GROUP BY cat.id
      ORDER BY count DESC
    `).all(...params);

    // Status breakdown
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM complaints c
      ${whereSql}
      GROUP BY status
    `).all(...params);

    // Priority breakdown
    const priorityCounts = db.prepare(`
      SELECT priority, COUNT(*) AS count
      FROM complaints c
      ${whereSql}
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END
    `).all(...params);

    // Ward distribution (real database counts)
    const wardCounts = db.prepare(`
      SELECT COALESCE(c.ward, 'Unassigned Ward') AS ward_name, COUNT(*) AS count,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count,
             SUM(CASE WHEN c.status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS pending_count
      FROM complaints c
      ${whereSql}
      GROUP BY ward_name
      ORDER BY count DESC
    `).all(...params);

    // Department Performance & Pending load
    const departmentPerformance = db.prepare(`
      SELECT d.id, d.name AS department_name,
             COUNT(c.id) AS total_assigned,
             SUM(CASE WHEN c.status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS pending_count,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count,
             ROUND(AVG(CASE WHEN c.resolved_at IS NOT NULL THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24 ELSE NULL END), 1) AS avg_resolution_hours
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id ${whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ') : ''}
      GROUP BY d.id
      ORDER BY pending_count DESC, total_assigned DESC
    `).all(...params);

    // District breakdown
    const districtCounts = db.prepare(`
      SELECT district, COUNT(*) AS count
      FROM complaints c
      ${whereSql}
      GROUP BY district
      ORDER BY count DESC
      LIMIT 10
    `).all(...params);

    // Average resolution time for closed/resolved complaints (in hours)
    const avgResolutionTime = db.prepare(`
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS avg_hours
      FROM complaints c
      ${whereSql ? whereSql + ' AND resolved_at IS NOT NULL' : 'WHERE resolved_at IS NOT NULL'}
    `).get(...params).avg_hours;

    // Monthly volume trend
    const monthlyTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
      FROM complaints c
      ${whereSql}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(...params).reverse();

    // Overall numbers
    const totalComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints c ${whereSql}`).get(...params).count;
    const resolvedComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints c ${whereSql ? whereSql + " AND c.status IN ('RESOLVED', 'CLOSED')" : "WHERE c.status IN ('RESOLVED', 'CLOSED')"}`).get(...params).count;
    const pendingComplaints = totalComplaints - resolvedComplaints;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

    // Overdue complaints count evaluated with SLA engine
    const activeComplaintsForSla = db.prepare(`
      SELECT c.* FROM complaints c
      ${whereSql ? whereSql + " AND c.status NOT IN ('RESOLVED', 'CLOSED')" : "WHERE c.status NOT IN ('RESOLVED', 'CLOSED')"}
    `).all(...params);

    let overdueComplaintsCount = 0;
    const highPriorityLocations = [];
    for (const comp of activeComplaintsForSla) {
      const sla = evaluateSla(comp);
      if (sla.isOverdue) overdueComplaintsCount++;
      if (comp.priority === 'CRITICAL' || comp.priority === 'HIGH') {
        highPriorityLocations.push({
          id: comp.id,
          code: comp.complaint_code,
          title: comp.title,
          ward: comp.ward || 'Unassigned',
          address: comp.address,
          latitude: comp.latitude,
          longitude: comp.longitude,
          priority: comp.priority,
          status: comp.status,
        });
      }
    }

    // Dynamic Data-driven Civic Insights
    const civicInsights = [];
    if (wardCounts.length > 0 && wardCounts[0].pending_count > 0) {
      civicInsights.push({
        type: 'critical',
        title: 'Highest Pending Load by Ward',
        message: `${wardCounts[0].ward_name} currently has ${wardCounts[0].pending_count} pending civic complaints requiring intervention.`,
        metric: `${wardCounts[0].pending_count} pending`,
      });
    }

    // Top issue category
    const activeCategories = categoryCounts.filter(c => c.count > 0);
    if (activeCategories.length > 0) {
      const topCat = activeCategories[0];
      const pct = Math.round((topCat.count / (totalComplaints || 1)) * 100);
      civicInsights.push({
        type: 'trend',
        title: 'Dominant Civic Problem Category',
        message: `"${topCat.name}" forms ${pct}% (${topCat.count} of ${totalComplaints}) of all grievances recorded in this view.`,
        metric: `${pct}% volume`,
      });
    }

    // Highest pending department
    const deptsWithPending = [...departmentPerformance].sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0));
    if (deptsWithPending.length > 0 && deptsWithPending[0].pending_count > 0) {
      civicInsights.push({
        type: 'action',
        title: 'Department Workload Bottleneck',
        message: `${deptsWithPending[0].department_name} has the largest backlog with ${deptsWithPending[0].pending_count} active tickets.`,
        metric: `${deptsWithPending[0].pending_count} active tickets`,
      });
    }

    // Overdue alert
    if (overdueComplaintsCount > 0) {
      civicInsights.push({
        type: 'alert',
        title: 'SLA Escalation Alert',
        message: `${overdueComplaintsCount} complaint(s) have exceeded their statutory SLA response targets. Immediate supervisory review needed.`,
        metric: `${overdueComplaintsCount} overdue`,
      });
    } else {
      civicInsights.push({
        type: 'success',
        title: 'Healthy SLA Compliance',
        message: 'No complaints are currently breaching their municipal Service Level Agreement target.',
        metric: '100% on-track',
      });
    }

    return res.json({
      success: true,
      analytics: {
        totalComplaints,
        resolvedComplaints,
        pendingComplaints,
        resolutionRate,
        overdueComplaintsCount,
        avgResolutionHours: avgResolutionTime ? Math.round(avgResolutionTime * 10) / 10 : 0,
        categoryCounts,
        statusCounts,
        priorityCounts,
        wardCounts,
        departmentPerformance,
        districtCounts,
        monthlyTrend,
        highPriorityLocations: highPriorityLocations.slice(0, 10),
        civicInsights,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, message: 'Could not compute analytics.' });
  }
});

/**
 * GET /api/admin/citizens
 * List registered citizens with complaint count and details
 */
router.get('/citizens', (req, res) => {
  try {
    const citizens = db.prepare(`
      SELECT u.id, u.name, u.email, u.mobile, u.state, u.district, u.created_at,
             COUNT(c.id) AS complaints_count,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count
      FROM users u
      LEFT JOIN complaints c ON u.id = c.citizen_id
      WHERE u.role = 'CITIZEN'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    return res.json({ success: true, citizens });
  } catch (err) {
    console.error('Citizens fetch error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch citizens list.' });
  }
});

/**
 * GET /api/admin/escalations
 * List escalated complaints with reason and audit history
 */
router.get('/escalations', (req, res) => {
  try {
    const escalations = db.prepare(`
      SELECT c.*,
             cat.name AS category_name,
             d.name AS department_name,
             u.name AS citizen_name, u.mobile AS citizen_mobile,
             (SELECT reason FROM escalation_records WHERE complaint_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_escalation_reason,
             (SELECT created_at FROM escalation_records WHERE complaint_id = c.id ORDER BY created_at DESC LIMIT 1) AS escalated_at
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.is_escalated = 1
      ORDER BY c.updated_at DESC
    `).all();

    const enriched = escalations.map(c => ({
      ...c,
      sla: evaluateSla(c),
    }));

    return res.json({ success: true, escalations: enriched });
  } catch (err) {
    console.error('Escalations fetch error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch escalations.' });
  }
});

/**
 * GET /api/admin/verifications
 * List complaints requiring resolution verification or reopened by citizens
 */
router.get('/verifications', (req, res) => {
  try {
    const verifications = db.prepare(`
      SELECT c.id, c.complaint_code, c.title, c.district, c.status, c.priority, c.created_at, c.resolved_at,
             cat.name AS category_name,
             d.name AS department_name,
             u.name AS citizen_name, u.mobile AS citizen_mobile,
             r.resolution_notes, r.evidence_image_url, r.verified_by_citizen, r.citizen_feedback, r.verified_at,
             admin_u.name AS resolved_by_officer
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      JOIN resolution_evidence r ON c.id = r.complaint_id
      LEFT JOIN users admin_u ON r.admin_id = admin_u.id
      ORDER BY r.created_at DESC
    `).all();

    return res.json({ success: true, verifications });
  } catch (err) {
    console.error('Verifications fetch error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch verifications.' });
  }
});

module.exports = router;
module.exports.VALID_STATUS_TRANSITIONS = VALID_STATUS_TRANSITIONS;
