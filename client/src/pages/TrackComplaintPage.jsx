import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Building,
  User,
  ShieldAlert,
  ThumbsUp,
  FileText,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
} from 'lucide-react';

export default function TrackComplaintPage({ initialCode = '', onOpenAuth }) {
  const { user, isAuthenticated, authFetch } = useAuth();

  const [searchCode, setSearchCode] = useState(initialCode);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resolution verification modal state
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyAction, setVerifyAction] = useState(null); // 'CONFIRM' or 'UNRESOLVED'

  // Escalation state
  const [escalationReason, setEscalationReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);

  // Auto-fetch if initialCode provided
  useEffect(() => {
    if (initialCode) {
      setSearchCode(initialCode);
      handleTrackLookup(initialCode);
    }
  }, [initialCode]);

  const handleTrackLookup = async (codeToSearch) => {
    const code = (codeToSearch || searchCode).trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError('');
    setComplaint(null);

    try {
      const res = await authFetch(`/api/complaints/track/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No complaint found matching this code.');
      }

      setComplaint(data.complaint);
    } catch (err) {
      setError(err.message || 'Could not locate complaint.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionVerification = async (action) => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await authFetch(`/api/complaints/${complaint.id}/verify-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: verificationFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit verification.');
      }

      setVerifyAction(null);
      setVerificationFeedback('');
      handleTrackLookup(complaint.complaint_code);
    } catch (err) {
      setError(err.message || 'Could not verify resolution.');
    } finally {
      setVerifying(false);
    }
  };

  const handleEscalationSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    setEscalating(true);
    setError('');

    try {
      const res = await authFetch(`/api/complaints/${complaint.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: escalationReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Escalation failed.');
      }

      setShowEscalationModal(false);
      setEscalationReason('');
      handleTrackLookup(complaint.complaint_code);
    } catch (err) {
      setError(err.message || 'Escalation could not be submitted.');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 bg-[#F4F7F8]">
      
      {/* Header & Lookup Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#193B50] tracking-tight">Track Civic Complaint Progress</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Enter your unique Complaint ID (e.g. <span className="font-mono font-bold text-[#193B50]">CC-2026-00001</span>) to view real-time department status, field actions, and resolution proof.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrackLookup();
          }}
          className="flex flex-col sm:flex-row gap-2.5 max-w-lg"
        >
          <input
            type="text"
            required
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="e.g. CC-2026-00001"
            className="flex-1 px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] font-mono uppercase tracking-wider bg-white text-[#253746]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-[#D6A64F]" />
            {loading ? 'Searching...' : 'Track Issue'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#C65B5B] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* COMPLAINT DETAILS & TIMELINE */}
      {complaint && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Main Status & SLA Banner */}
          <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE5E9]/60 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-extrabold text-[#193B50] font-mono bg-[#F4F7F8] px-2.5 py-0.5 rounded-md border border-[#DCE5E9]">
                    {complaint.complaint_code}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#287C78]/15 text-[#287C78] border border-[#287C78]/30">
                    {complaint.category_name}
                  </span>
                  {complaint.is_escalated ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C65B5B]/15 text-[#C65B5B] border border-[#C65B5B]/30 uppercase">
                      ⚠️ Escalated
                    </span>
                  ) : null}
                </div>
                <h2 className="text-lg font-bold text-[#193B50] mt-1.5">{complaint.title}</h2>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs text-[#64748B] block font-medium">Current Status:</span>
                <span className="text-sm font-extrabold text-[#193B50] uppercase tracking-wide">
                  {complaint.status.replace('_', ' ')}
                </span>
                <div className="text-xs mt-0.5">
                  <span className={`font-semibold ${complaint.sla?.statusClass}`}>{complaint.sla?.label}</span>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block text-[11px] font-medium">Reported Date:</span>
                <span className="font-bold text-[#253746]">
                  {new Date(complaint.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[11px] font-medium">Assigned Department:</span>
                <span className="font-bold text-[#253746]">
                  {complaint.department_name || 'Pending municipal triage'}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[11px] font-medium">Assigned Priority:</span>
                <span className="font-bold text-[#193B50]">{complaint.priority}</span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[11px] font-medium">Community Support:</span>
                <span className="font-bold text-[#287C78]">
                  {complaint.support_count || 0} Citizens
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[#64748B] block text-[11px] font-medium">Exact Location:</span>
              <p className="text-xs text-[#253746] mt-0.5 font-medium">
                📍 {complaint.address} {complaint.landmark ? `(Landmark: ${complaint.landmark})` : ''}, {complaint.district}, {complaint.state}
              </p>
            </div>

            {/* Photo Gallery */}
            {complaint.images && complaint.images.length > 0 && (
              <div className="pt-2">
                <span className="text-[#64748B] block text-[11px] font-medium mb-2">Attached Citizen Evidence:</span>
                <div className="flex flex-wrap gap-2">
                  {complaint.images.map((img) => (
                    <a
                      key={img.id}
                      href={img.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block w-20 h-20 rounded-lg overflow-hidden border border-[#DCE5E9]"
                    >
                      <img
                        src={img.file_url}
                        alt="Evidence"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RESOLUTION VERIFICATION WIDGET */}
          {complaint.status === 'RESOLVED' && (
            <div className="bg-emerald-50/90 border-2 border-[#328568] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#1F5441] font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-[#328568]" />
                <span>Municipal Resolution Evidence Provided - Citizen Verification Required</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-[#193B50] block mb-1">Official Remedial Notes:</span>
                  <p className="text-[#253746] leading-relaxed">
                    {complaint.resolutionEvidence?.resolution_notes || 'The assigned department has completed maintenance work at the site.'}
                  </p>
                </div>

                {complaint.resolutionEvidence?.evidence_image_url && (
                  <div>
                    <span className="font-bold text-[#193B50] block mb-1">Resolution Photograph:</span>
                    <a
                      href={complaint.resolutionEvidence.evidence_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={complaint.resolutionEvidence.evidence_image_url}
                        alt="Resolution Proof"
                        className="w-36 h-36 object-cover rounded-lg border border-[#DCE5E9]"
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* Citizen Owner Verification Actions */}
              {complaint.isOwner ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-[#1F5441] font-semibold">
                    As the citizen who reported this grievance, please inspect the work and verify whether it has been resolved on-ground:
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleResolutionVerification('CONFIRM')}
                      disabled={verifying}
                      className="px-5 py-2.5 bg-[#328568] text-white rounded-lg text-xs font-bold hover:bg-[#286B54] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      {verifying ? 'Updating...' : 'Confirm Resolution (Close Complaint)'}
                    </button>

                    <button
                      onClick={() => setVerifyAction('UNRESOLVED')}
                      disabled={verifying}
                      className="px-5 py-2.5 bg-[#C65B5B] text-white rounded-lg text-xs font-bold hover:bg-[#A84545] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Report Unresolved (Reopen Issue)
                    </button>
                  </div>

                  {verifyAction === 'UNRESOLVED' && (
                    <div className="bg-white p-4 rounded-xl border border-red-300 space-y-3 text-xs">
                      <label className="block font-bold text-[#C65B5B]">
                        Please explain why the resolution was unsatisfactory (Minimum 10 characters):
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={verificationFeedback}
                        onChange={(e) => setVerificationFeedback(e.target.value)}
                        placeholder="e.g. The surface was patched with loose gravel but the deep sub-layer remains sunken..."
                        className="w-full p-2.5 border border-red-300 rounded-lg focus:outline-none focus:border-red-600 text-[#253746]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolutionVerification('UNRESOLVED')}
                          disabled={verifying || verificationFeedback.trim().length < 10}
                          className="px-4 py-2 bg-[#C65B5B] text-white rounded-lg text-xs font-bold hover:bg-[#A84545] disabled:opacity-50"
                        >
                          Submit Reopen Request
                        </button>
                        <button
                          onClick={() => setVerifyAction(null)}
                          className="px-4 py-2 border border-[#DCE5E9] rounded-lg text-xs font-semibold text-[#64748B]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#64748B] italic">
                  Resolution verification is reserved for the citizen who lodged this complaint.
                </p>
              )}
            </div>
          )}

          {/* ESCALATION BUTTON IF ELIGIBLE */}
          {complaint.isOwner && !complaint.is_escalated && complaint.escalationEligibility?.eligible && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-amber-900">Response window or SLA elapsed</span>
                <p className="text-amber-800">You are eligible to escalate this complaint to supervisory authorities.</p>
              </div>
              <button
                onClick={() => setShowEscalationModal(true)}
                className="px-4 py-2 bg-[#D49A37] text-white rounded-lg text-xs font-bold hover:bg-[#B58229] shrink-0 shadow-xs"
              >
                Request Escalation
              </button>
            </div>
          )}

          {/* ESCALATION MODAL */}
          {showEscalationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#DCE5E9] space-y-4 text-xs shadow-2xl">
                <h3 className="font-bold text-sm text-[#193B50]">Escalate Complaint to Supervisory Authority</h3>
                <p className="text-[#64748B]">
                  State why you are requesting escalation. Senior municipal directors will review the audit history.
                </p>
                <textarea
                  rows={4}
                  required
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="State the urgency, lack of action, or safety hazard..."
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowEscalationModal(false)}
                    className="px-4 py-2 border rounded-lg text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEscalationSubmit}
                    disabled={escalating || escalationReason.trim().length < 10}
                    className="px-4 py-2 bg-[#C65B5B] text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {escalating ? 'Submitting...' : 'Confirm Escalation'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATUS TRANSITION TIMELINE */}
          <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 shadow-xs space-y-6">
            <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
              Complaint Lifecycle Timeline
            </h3>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#DCE5E9]">
              {complaint.timeline && complaint.timeline.length > 0 ? (
                complaint.timeline.map((step, idx) => (
                  <div key={step.id || idx} className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#193B50] border-4 border-white shadow-xs flex items-center justify-center" />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#193B50] uppercase tracking-wide">
                          {step.new_status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {new Date(step.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-[#253746]">{step.remarks || 'Status updated.'}</p>
                      {step.updated_by_name && (
                        <p className="text-[10px] text-[#64748B]">
                          Action by: {step.updated_by_name} ({step.updated_by_role || 'Authority'})
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#64748B]">Timeline events will appear as status progresses.</div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
