import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAllDrafts, deleteDraft, updateDraftStatus } from '../utils/offlineDrafts';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Search,
  Wifi,
  WifiOff,
  Trash2,
  Send,
} from 'lucide-react';

export default function MyComplaintsPage({ onNavigate }) {
  const { user, authFetch } = useAuth();
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [offlineDrafts, setOfflineDrafts] = useState([]);
  const [syncingDraftId, setSyncingDraftId] = useState(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [syncErrorMsg, setSyncErrorMsg] = useState('');
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    reopened: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/complaints/my');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setMetrics(data.metrics || {});
      }
    } catch (err) {
      console.error('Failed to load citizen complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineDrafts = async () => {
    try {
      const drafts = await getAllDrafts();
      setOfflineDrafts(drafts || []);
    } catch (e) {
      console.warn('Could not read offline drafts from IndexedDB:', e);
    }
  };

  useEffect(() => {
    fetchMyData();
    loadOfflineDrafts();
  }, [authFetch]);

  // Sync draft to server with user confirmation
  const handleSyncDraft = async (draft) => {
    if (!window.navigator.onLine) {
      setSyncErrorMsg('You are currently offline. Please reconnect to sync this draft.');
      return;
    }

    if (!window.confirm(`Submit draft "${draft.title}" to municipal authorities?`)) {
      return;
    }

    setSyncingDraftId(draft.localId);
    setSyncErrorMsg('');
    await updateDraftStatus(draft.localId, 'SYNCING');

    try {
      const formData = new FormData();
      formData.append('category_id', draft.category_id || 1);
      formData.append('title', draft.title);
      formData.append('description', draft.description);
      formData.append('address', draft.address || '');
      if (draft.landmark) formData.append('landmark', draft.landmark);
      formData.append('district', draft.district || user?.district || '');
      formData.append('state', draft.state || user?.state || '');
      if (draft.ward) formData.append('ward', draft.ward);
      if (draft.latitude) formData.append('latitude', draft.latitude);
      if (draft.longitude) formData.append('longitude', draft.longitude);

      const res = await authFetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        await deleteDraft(draft.localId);
        setSyncSuccessMsg(`Draft successfully lodged! Tracking ID: ${resData.complaint.complaint_code}`);
        setTimeout(() => setSyncSuccessMsg(''), 6000);
        await loadOfflineDrafts();
        await fetchMyData();
      } else {
        await updateDraftStatus(draft.localId, 'FAILED', resData.message || 'Submission failed');
        setSyncErrorMsg(resData.message || 'Failed to sync draft to server.');
        await loadOfflineDrafts();
      }
    } catch (err) {
      console.error('Draft sync error:', err);
      await updateDraftStatus(draft.localId, 'FAILED', 'Network error');
      setSyncErrorMsg('Network error while syncing draft. Will retry when connectivity stabilizes.');
      await loadOfflineDrafts();
    } finally {
      setSyncingDraftId(null);
    }
  };

  const handleDeleteDraft = async (localId) => {
    if (window.confirm('Are you sure you want to delete this offline draft?')) {
      await deleteDraft(localId);
      await loadOfflineDrafts();
    }
  };

  // Check if any complaints are pending citizen verification
  const verificationPendingComplaints = complaints.filter((c) => c.status === 'RESOLVED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F4F7F8]">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#193B50] tracking-tight">Citizen Civic Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Welcome back, <span className="font-bold text-[#193B50]">{user?.name}</span> • Jurisdiction:{' '}
            <span className="font-semibold text-[#287C78]">{user?.district && user?.state ? `${user.district}, ${user.state}` : (user?.district || user?.state || 'Pan-India')}</span>
          </p>
        </div>

        <button
          onClick={() => onNavigate('report')}
          className="px-5 py-2.5 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] shadow-sm flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-[#D6A64F]" />
          Report New Issue
        </button>
      </div>

      {/* Verification Alert Banner if complaints waiting for verification */}
      {verificationPendingComplaints.length > 0 && (
        <div className="p-4 bg-emerald-50/90 border border-[#328568]/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-start gap-3 text-[#1F5441]">
            <CheckCircle className="w-5 h-5 text-[#328568] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">
                {verificationPendingComplaints.length} of your reported complaints have been marked as RESOLVED!
              </span>
              <p className="text-[11px] text-[#2E7A60] mt-0.5 leading-relaxed">
                Please review the repair notes and photographic proof submitted by the municipal field crew to officially confirm closure or request rework.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('track', verificationPendingComplaints[0].complaint_code)}
            className="px-4 py-2 bg-[#328568] text-white rounded-lg font-bold hover:bg-[#286B54] shrink-0 shadow-xs"
          >
            Review Evidence
          </button>
        </div>
      )}

      {/* Real Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <span className="text-[11px] text-[#64748B] font-semibold block uppercase tracking-wider">Total Lodged</span>
          <span className="text-2xl font-extrabold text-[#193B50] mt-1 block">{metrics.total}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <span className="text-[11px] text-[#64748B] font-semibold block uppercase tracking-wider">Under Review</span>
          <span className="text-2xl font-extrabold text-[#D49A37] mt-1 block">{metrics.pending}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <span className="text-[11px] text-[#64748B] font-semibold block uppercase tracking-wider">In Progress</span>
          <span className="text-2xl font-extrabold text-[#287C78] mt-1 block">{metrics.inProgress}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <span className="text-[11px] text-[#64748B] font-semibold block uppercase tracking-wider">Resolved &amp; Closed</span>
          <span className="text-2xl font-extrabold text-[#328568] mt-1 block">{metrics.resolved}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-[#64748B] font-semibold block uppercase tracking-wider">Reopened</span>
          <span className="text-2xl font-extrabold text-[#C65B5B] mt-1 block">{metrics.reopened}</span>
        </div>
      </div>

      {/* Offline Drafts Section (Phase 4) */}
      {offlineDrafts.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-amber-200 bg-amber-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-700" />
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                {t('dashboard.offlineDraftsHeader')} ({offlineDrafts.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">Stored securely in local IndexedDB</span>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-[#1F5441] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#328568]" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {syncErrorMsg && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-[#C65B5B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C65B5B]" />
              <span>{syncErrorMsg}</span>
            </div>
          )}

          <div className="divide-y divide-[#DCE5E9]">
            {offlineDrafts.map((draft) => (
              <div key={draft.localId} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      OFFLINE DRAFT • {draft.syncStatus || 'PENDING'}
                    </span>
                    <span className="text-xs font-bold text-[#193B50]">{draft.title}</span>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-1">{draft.description}</p>
                  <span className="text-[11px] text-[#64748B] block">📍 {draft.address || draft.district || 'Location saved'} • Saved {new Date(draft.createdAt).toLocaleTimeString()}</span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleSyncDraft(draft)}
                    disabled={syncingDraftId === draft.localId}
                    className="px-3.5 py-1.5 bg-[#287C78] text-white rounded-lg text-xs font-bold hover:bg-[#1F6360] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {syncingDraftId === draft.localId ? 'Syncing...' : 'Submit to Authority'}
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.localId)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citizen's Complaint List */}
      <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#DCE5E9] flex items-center justify-between bg-[#F4F7F8]">
          <h2 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
            My Submitted Complaints ({complaints.length})
          </h2>
          <span className="text-[11px] text-[#64748B]">Click any complaint to track live timeline</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">Loading your complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-3">
            <p>You have not reported any civic issues yet.</p>
            <button
              onClick={() => onNavigate('report')}
              className="px-4 py-2 bg-[#193B50] text-white rounded-lg text-xs font-bold"
            >
              Report Your First Civic Issue
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE5E9]/60">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => onNavigate('track', c.complaint_code)}
                className="p-4 sm:p-5 hover:bg-[#F4F7F8] cursor-pointer transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#193B50] bg-[#F4F7F8] px-2.5 py-0.5 rounded-md border border-[#DCE5E9]">
                      {c.complaint_code}
                    </span>
                    <span className="text-xs font-bold text-[#287C78]">
                      {c.category_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        c.status === 'RESOLVED' || c.status === 'CLOSED'
                          ? 'bg-[#328568]/15 text-[#328568] border border-[#328568]/30'
                          : c.status === 'REOPENED'
                          ? 'bg-[#C65B5B]/15 text-[#C65B5B] border border-[#C65B5B]/30'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-[#193B50]/10 text-[#193B50] border border-[#193B50]/20'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#193B50]">{c.title}</h3>
                  <p className="text-xs text-[#64748B] line-clamp-1">📍 {c.address}, {c.district}</p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#64748B] block font-medium">
                      {new Date(c.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={`text-[11px] font-semibold ${c.sla?.statusClass}`}>
                      {c.sla?.label}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
