const config = require('../config');

/**
 * Calculates resolution deadline from creation date, priority, and optional department SLA
 */
function calculateSlaDeadline(createdAtDate, priority = 'MEDIUM', departmentSlaHours = null) {
  const baseDate = createdAtDate ? new Date(createdAtDate) : new Date();
  const slaHours = departmentSlaHours || config.DEFAULT_SLA_HOURS[priority] || 72;
  const deadline = new Date(baseDate.getTime() + slaHours * 60 * 60 * 1000);
  return deadline.toISOString();
}

/**
 * Evaluates SLA status for a complaint
 */
function evaluateSla(complaint) {
  if (!complaint.sla_deadline) {
    return {
      isOverdue: false,
      hoursRemaining: null,
      hoursOverdue: null,
      deadlineText: 'No SLA assigned',
      statusClass: 'text-gray-500',
    };
  }

  // If already resolved or closed, check if it was resolved before deadline
  if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') {
    const resolvedTime = complaint.resolved_at ? new Date(complaint.resolved_at).getTime() : new Date().getTime();
    const deadlineTime = new Date(complaint.sla_deadline).getTime();
    const metSla = resolvedTime <= deadlineTime;
    return {
      isOverdue: !metSla,
      metSla,
      hoursRemaining: 0,
      hoursOverdue: metSla ? 0 : Math.round((resolvedTime - deadlineTime) / (1000 * 60 * 60)),
      statusClass: metSla ? 'text-green-600' : 'text-amber-600',
      label: metSla ? 'Resolved within SLA' : 'Resolved past SLA deadline',
    };
  }

  const now = new Date().getTime();
  const deadlineTime = new Date(complaint.sla_deadline).getTime();
  const diffMs = deadlineTime - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) {
    const hoursOverdue = Math.abs(diffHours);
    return {
      isOverdue: true,
      hoursRemaining: 0,
      hoursOverdue,
      statusClass: 'text-red-600 font-semibold',
      label: `Overdue by ${hoursOverdue > 24 ? Math.floor(hoursOverdue / 24) + 'd ' + (hoursOverdue % 24) + 'h' : hoursOverdue + 'h'}`,
    };
  } else {
    return {
      isOverdue: false,
      hoursRemaining: diffHours,
      hoursOverdue: 0,
      statusClass: diffHours <= 12 ? 'text-amber-600' : 'text-blue-600',
      label: `${diffHours > 24 ? Math.floor(diffHours / 24) + 'd ' + (diffHours % 24) + 'h' : diffHours + 'h'} remaining`,
    };
  }
}

/**
 * Checks if a citizen is eligible to request escalation
 * Allowed if status is still SUBMITTED/UNDER_REVIEW/ASSIGNED/IN_PROGRESS and either overdue OR older than 48 hours without update
 */
function isEligibleForEscalation(complaint) {
  if (['RESOLVED', 'CLOSED'].includes(complaint.status)) {
    return { eligible: false, reason: 'Complaint has already been resolved.' };
  }
  if (complaint.is_escalated) {
    return { eligible: false, reason: 'This complaint has already been escalated to supervisory authorities.' };
  }

  const now = new Date().getTime();
  const createdTime = new Date(complaint.created_at).getTime();
  const hoursSinceCreation = (now - createdTime) / (1000 * 60 * 60);

  const sla = evaluateSla(complaint);
  if (sla.isOverdue || hoursSinceCreation >= 48) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Complaints can be escalated once the standard response window (48 hours) or SLA target elapses. Currently ${Math.round(hoursSinceCreation)}h elapsed.`,
  };
}

module.exports = {
  calculateSlaDeadline,
  evaluateSla,
  isEligibleForEscalation,
};
