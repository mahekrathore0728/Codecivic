import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CivicMap from '../components/CivicMap';
import { getAllStates, getDistrictsForState } from '../utils/indiaGeoData';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building,
  RotateCcw,
  Search,
  Filter,
  BarChart3,
  Repeat,
  FileCheck,
  Send,
  Upload,
  X,
  ExternalLink,
  Settings,
  LayoutDashboard,
  Layers,
  ArrowUpRight,
  Shield,
  FileWarning,
  Sliders,
  Check,
  MapPin,
} from 'lucide-react';

export default function AdminDashboardPage({ onNavigate, activeTabProp, onTabChange }) {
  const { user, isAdmin, authFetch } = useAuth();

  // Sidebar active tab
  const [internalActiveTab, setInternalActiveTab] = useState('overview');
  const activeTab = activeTabProp || internalActiveTab;
  const setActiveTab = (tab) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [loading, setLoading] = useState(true);

  // Overview stats & feeds
  const [stats, setStats] = useState({});
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Complaints Table State
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterDemo, setFilterDemo] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterEscalated, setFilterEscalated] = useState(false);

  // Citizens, Escalations, Verifications, Recurring, Analytics
  const [citizensList, setCitizensList] = useState([]);
  const [escalationsList, setEscalationsList] = useState([]);
  const [verificationsList, setVerificationsList] = useState([]);
  const [recurringHotspots, setRecurringHotspots] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsFilterState, setAnalyticsFilterState] = useState('');
  const [analyticsFilterDistrict, setAnalyticsFilterDistrict] = useState('');
  const [analyticsFilterWard, setAnalyticsFilterWard] = useState('');
  const [analyticsFilterCategory, setAnalyticsFilterCategory] = useState('');
  const [analyticsFilterPriority, setAnalyticsFilterPriority] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Selected complaint for modal actions
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'status', 'assign', 'resolve'

  // Action form states
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignPriority, setAssignPriority] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Department creation modal
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptData, setNewDeptData] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    head_officer: '',
    sla_hours_default: 48,
  });

  // Fetch Dashboard Stats & Initial Data
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
        setRecentComplaints(data.recentComplaints || []);
        setActivityLogs(data.activityLogs || []);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }, [authFetch]);

  // Fetch Complaints List
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (filterCategory) params.append('category_id', filterCategory);
      if (filterDepartment) params.append('department_id', filterDepartment);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterState) params.append('state', filterState);
      if (filterDistrict) params.append('district', filterDistrict);
      if (filterDemo) params.append('is_demo', filterDemo);
      if (filterOverdue) params.append('is_overdue', 'true');
      if (filterEscalated) params.append('is_escalated', 'true');

      params.append('limit', 100);

      const res = await authFetch(`/api/admin/complaints?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Error loading admin complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterDepartment, filterStatus, filterPriority, filterState, filterDistrict, filterDemo, filterOverdue, filterEscalated, authFetch]);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  }, [authFetch]);

  // Fetch Analytics with Active Filters
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const q = new URLSearchParams();
      if (analyticsFilterState) q.append('state', analyticsFilterState);
      if (analyticsFilterDistrict) q.append('district', analyticsFilterDistrict);
      if (analyticsFilterWard) q.append('ward', analyticsFilterWard);
      if (analyticsFilterCategory) q.append('category_id', analyticsFilterCategory);
      if (analyticsFilterPriority) q.append('priority', analyticsFilterPriority);

      const res = await authFetch(`/api/admin/analytics?${q.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setAnalyticsData(d.analytics || null);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFilterState, analyticsFilterDistrict, analyticsFilterWard, analyticsFilterCategory, analyticsFilterPriority, authFetch]);

  // Fetch Tab Specific Data
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'citizens') {
      authFetch('/api/admin/citizens')
        .then((r) => r.json())
        .then((d) => setCitizensList(d.citizens || []))
        .catch(console.error);
    } else if (activeTab === 'escalations') {
      authFetch('/api/admin/escalations')
        .then((r) => r.json())
        .then((d) => setEscalationsList(d.escalations || []))
        .catch(console.error);
    } else if (activeTab === 'verifications') {
      authFetch('/api/admin/verifications')
        .then((r) => r.json())
        .then((d) => setVerificationsList(d.verifications || []))
        .catch(console.error);
    } else if (activeTab === 'hotspots') {
      authFetch('/api/admin/recurring-issues')
        .then((r) => r.json())
        .then((d) => setRecurringHotspots(d.hotspots || []))
        .catch(console.error);
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, isAdmin, authFetch, fetchAnalytics]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboardData();
    fetchComplaints();
    fetchDepartments();
    fetch('/api/complaints/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, [isAdmin, fetchDashboardData, fetchComplaints, fetchDepartments]);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="w-12 h-12 text-[#C65B5B] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#193B50]">Administrative Access Restricted</h2>
        <p className="text-xs text-[#64748B] mt-1">
          This portal is reserved for authorized municipal officers and administrators in Kota.
        </p>
      </div>
    );
  }

  // Handle Status Update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/complaints/${selectedComplaint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, remarks: statusRemarks }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Status update failed.');

      setModalAction(null);
      fetchComplaints();
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Department Assignment
  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/complaints/${selectedComplaint.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: assignDeptId,
          priority: assignPriority,
          remarks: statusRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Assignment failed.');

      setModalAction(null);
      fetchComplaints();
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Resolution with Evidence
  const handleResolveWithEvidence = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    setActionError('');
    try {
      const formData = new FormData();
      formData.append('resolution_notes', resolutionNotes);
      if (evidenceFile) {
        formData.append('evidence_image', evidenceFile);
      }

      const res = await authFetch(`/api/admin/complaints/${selectedComplaint.id}/resolve`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Resolution failed.');

      setModalAction(null);
      setResolutionNotes('');
      setEvidenceFile(null);
      fetchComplaints();
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Create Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeptData),
      });
      if (res.ok) {
        setShowAddDeptModal(false);
        setNewDeptData({
          name: '',
          description: '',
          contact_email: '',
          contact_phone: '',
          head_officer: '',
          sla_hours_default: 48,
        });
        fetchDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sidebar Navigation Links
  const sidebarNav = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'complaints', label: 'All Complaints', icon: Layers, badge: complaints.length },
    { id: 'departments', label: 'Departments', icon: Building, badge: departments.length },
    { id: 'citizens', label: 'Citizens Registry', icon: Users },
    { id: 'analytics', label: 'Civic Intelligence', icon: BarChart3 },
    { id: 'hotspots', label: 'Hotspots Map', icon: MapPin },
    { id: 'escalations', label: 'Escalations', icon: FileWarning, badge: stats.overdueCount > 0 ? 'Urgent' : null },
    { id: 'verifications', label: 'Resolution Proofs', icon: FileCheck },
    { id: 'settings', label: 'System Settings', icon: Sliders },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#F4F7F8]">
      
      {/* Top Authority Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#193B50] text-white p-6 rounded-2xl shadow-sm border border-[#254A63]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D6A64F] text-[#193B50]">
              Municipal Console
            </span>
            <span className="text-xs text-[#DCE5E9]">Nagar Nigam Kota Civic Directorate</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Civic Operations &amp; Grievance Management</h1>
          <p className="text-xs text-[#DCE5E9]/80">
            Authorized Officer: <span className="font-bold text-white">{user.name}</span> (ADMIN)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/20">
            <span className="text-[10px] text-[#DCE5E9] block font-semibold">Overdue Complaints:</span>
            <span className="font-extrabold text-[#D6A64F] text-base">{stats.overdueCount || 0}</span>
          </div>
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/20">
            <span className="text-[10px] text-[#DCE5E9] block font-semibold">Reopened Cases:</span>
            <span className="font-extrabold text-[#C65B5B] text-base">{stats.reopened || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Clean Sidebar Navigation + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR NAVIGATION (REQUIREMENT 6) */}
        <aside className="lg:col-span-3 bg-white rounded-2xl border border-[#DCE5E9] p-3 shadow-2xs space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#DCE5E9]/60 mb-2">
            Admin Navigation
          </div>

          {sidebarNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-[#193B50] text-white shadow-xs'
                    : 'text-[#253746] hover:bg-[#F4F7F8] hover:text-[#193B50]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D6A64F]' : 'text-[#64748B]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'Urgent'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[#F4F7F8] text-[#64748B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* CONTENT AREA */}
        <div className="lg:col-span-9 space-y-6">

          {/* TAB 1: ALL COMPLAINTS TABLE */}
          {activeTab === 'complaints' && (
            <div className="space-y-4">
              
              {/* Filter Toolbar with Pan-India State/District & Demo Data separation */}
              <div className="bg-white p-4 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
                  
                  <div className="relative sm:col-span-2">
                    <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search code, title, citizen, locality..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
                    />
                  </div>

                  {/* State Filter */}
                  <div>
                    <select
                      value={filterState}
                      onChange={(e) => {
                        setFilterState(e.target.value);
                        setFilterDistrict('');
                      }}
                      className="w-full px-2 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    >
                      <option value="">All States / UTs</option>
                      {getAllStates().map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* District Filter */}
                  <div>
                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      disabled={!filterState}
                      className="w-full px-2 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746] disabled:opacity-50"
                    >
                      <option value="">{filterState ? 'All Districts' : 'Select State'}</option>
                      {getDistrictsForState(filterState).map((dst) => (
                        <option key={dst} value={dst}>{dst}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    >
                      <option value="">All Statuses</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REOPENED">Reopened</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  {/* Record Origin: All / Public / Demo */}
                  <div>
                    <select
                      value={filterDemo}
                      onChange={(e) => setFilterDemo(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    >
                      <option value="">All Complaint Records</option>
                      <option value="0">Public Citizen Reports</option>
                      <option value="1">Kota Evaluation Demo Data</option>
                    </select>
                  </div>

                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#DCE5E9]/60 gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterOverdue(!filterOverdue)}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-lg border text-center transition-colors ${
                        filterOverdue ? 'bg-[#C65B5B] text-white border-[#C65B5B]' : 'bg-[#F4F7F8] text-[#253746] border-[#DCE5E9]'
                      }`}
                    >
                      Overdue SLA Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterEscalated(!filterEscalated)}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-lg border text-center transition-colors ${
                        filterEscalated ? 'bg-[#D6A64F] text-[#193B50] border-[#D6A64F]' : 'bg-[#F4F7F8] text-[#253746] border-[#DCE5E9]'
                      }`}
                    >
                      Escalated Only
                    </button>
                  </div>

                  {(search || filterDepartment || filterStatus || filterPriority || filterState || filterDistrict || filterDemo || filterOverdue || filterEscalated) && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setFilterDepartment('');
                        setFilterStatus('');
                        setFilterPriority('');
                        setFilterState('');
                        setFilterDistrict('');
                        setFilterDemo('');
                        setFilterOverdue(false);
                        setFilterEscalated(false);
                      }}
                      className="text-[#287C78] hover:underline font-bold"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F4F7F8] border-b border-[#DCE5E9] text-[#193B50] font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Code &amp; Citizen</th>
                        <th className="px-4 py-3">Category &amp; Location</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">SLA Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE5E9]/60">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#64748B]">Loading complaints...</td>
                        </tr>
                      ) : complaints.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#64748B]">No complaints found matching criteria.</td>
                        </tr>
                      ) : (
                        complaints.map((c) => (
                          <tr key={c.id} className="hover:bg-[#F4F7F8]/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className="font-mono font-bold text-[#193B50] block">{c.complaint_code}</span>
                              <span className="text-[11px] text-[#253746] font-medium block">{c.citizen_name}</span>
                              <span className="text-[10px] text-[#64748B] block font-mono">{c.citizen_mobile}</span>
                            </td>

                            <td className="px-4 py-3.5 max-w-xs">
                              <span className="text-[10px] font-bold text-[#287C78] uppercase block tracking-wider">
                                {c.category_name}
                              </span>
                              <span className="font-bold text-[#193B50] block truncate">{c.title}</span>
                              <span className="text-[11px] text-[#64748B] block truncate">📍 {c.address}</span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="font-medium text-[#253746] block">
                                {c.department_name || <span className="text-[#D49A37] font-bold italic">Unassigned</span>}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.priority === 'CRITICAL'
                                    ? 'bg-[#C65B5B]/15 text-[#C65B5B]'
                                    : c.priority === 'HIGH'
                                    ? 'bg-[#D49A37]/15 text-[#9E6E1F]'
                                    : c.priority === 'MEDIUM'
                                    ? 'bg-[#287C78]/15 text-[#287C78]'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {c.priority}
                              </span>
                              {c.is_escalated ? (
                                <span className="block text-[9px] font-bold text-[#C65B5B] mt-0.5 uppercase">
                                  ⚠️ Escalated
                                </span>
                              ) : null}
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                  c.status === 'RESOLVED' || c.status === 'CLOSED'
                                    ? 'bg-[#328568]/15 text-[#328568]'
                                    : c.status === 'REOPENED'
                                    ? 'bg-[#C65B5B]/15 text-[#C65B5B]'
                                    : c.status === 'IN_PROGRESS'
                                    ? 'bg-[#193B50]/10 text-[#193B50]'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {c.status.replace('_', ' ')}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`text-[11px] block ${c.sla?.statusClass}`}>
                                {c.sla?.label}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setAssignDeptId(c.department_id || '');
                                  setAssignPriority(c.priority || 'MEDIUM');
                                  setStatusRemarks('');
                                  setModalAction('assign');
                                }}
                                className="px-2.5 py-1 bg-white border border-[#DCE5E9] rounded-md text-[11px] font-bold text-[#193B50] hover:bg-[#F4F7F8]"
                              >
                                Route
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setNewStatus(c.status);
                                  setStatusRemarks('');
                                  setModalAction('status');
                                }}
                                className="px-2.5 py-1 bg-white border border-[#DCE5E9] rounded-md text-[11px] font-bold text-[#193B50] hover:bg-[#F4F7F8]"
                              >
                                Status
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setResolutionNotes('');
                                  setEvidenceFile(null);
                                  setModalAction('resolve');
                                }}
                                className="px-3 py-1 bg-[#287C78] text-white rounded-md text-[11px] font-bold hover:bg-[#1F6360]"
                              >
                                Resolve
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-[#DCE5E9]">
                  <span className="text-xs text-[#64748B] font-semibold">Total Complaints</span>
                  <span className="text-2xl font-extrabold text-[#193B50] mt-1 block">{stats.total || 0}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-[#DCE5E9]">
                  <span className="text-xs text-[#64748B] font-semibold">Active In-Progress</span>
                  <span className="text-2xl font-extrabold text-[#287C78] mt-1 block">{stats.inProgress || 0}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-[#DCE5E9]">
                  <span className="text-xs text-[#64748B] font-semibold">Overdue SLA Target</span>
                  <span className="text-2xl font-extrabold text-[#D49A37] mt-1 block">{stats.overdueCount || 0}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-[#DCE5E9]">
                  <span className="text-xs text-[#64748B] font-semibold">Total Citizens Registered</span>
                  <span className="text-2xl font-extrabold text-[#193B50] mt-1 block">{stats.totalCitizens || 0}</span>
                </div>
              </div>

              {/* Audit Log */}
              <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
                  Live Administrative Audit Trail
                </h3>
                <div className="divide-y divide-[#DCE5E9]/60 max-h-96 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <div className="p-4 text-xs text-[#64748B]">No recent activity recorded.</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="py-2.5 text-xs flex justify-between items-start gap-3">
                        <div>
                          <span className="font-bold text-[#193B50]">{log.admin_name}</span>
                          <span className="text-[11px] text-[#64748B] block mt-0.5">{log.details}</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] whitespace-nowrap font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-[#193B50] uppercase tracking-wider">Kota Municipal Departments</h2>
                <button
                  onClick={() => setShowAddDeptModal(true)}
                  className="px-4 py-2 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B]"
                >
                  + Register Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((d) => (
                  <div key={d.id} className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-[#193B50]">{d.name}</h3>
                      <span className="text-[10px] bg-[#287C78]/15 text-[#287C78] px-2 py-0.5 rounded-md font-bold">
                        SLA: {d.sla_hours_default}h
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{d.description}</p>
                    
                    <div className="pt-2 border-t border-[#DCE5E9]/60 text-xs space-y-1 text-[#64748B]">
                      <div>Superintendent: <span className="text-[#253746] font-bold">{d.head_officer || 'Unassigned'}</span></div>
                      <div>Helpline: <span className="text-[#253746] font-mono">{d.contact_phone || 'N/A'}</span></div>
                      <div>Email: <span className="text-[#253746]">{d.contact_email || 'N/A'}</span></div>
                    </div>

                    <div className="pt-2 flex justify-between text-xs font-bold bg-[#F4F7F8] p-2.5 rounded-lg">
                      <span>Assigned Cases: {d.total_assigned || 0}</span>
                      <span className="text-[#328568]">Resolved: {d.resolved_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CITIZENS REGISTRY */}
          {activeTab === 'citizens' && (
            <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs overflow-hidden p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#193B50] uppercase tracking-wider">Registered Citizens Registry</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Verified resident accounts registered for civic reporting in Kota.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F7F8] border-b border-[#DCE5E9] text-[#193B50] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Citizen Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Complaints Filed</th>
                      <th className="px-4 py-3">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5E9]/60">
                    {citizensList.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F4F7F8]">
                        <td className="px-4 py-3 font-bold text-[#193B50]">{c.name}</td>
                        <td className="px-4 py-3 text-[#253746] font-mono">{c.email}</td>
                        <td className="px-4 py-3 text-[#64748B] font-mono">{c.mobile}</td>
                        <td className="px-4 py-3 text-[#64748B]">{c.district}, {c.state}</td>
                        <td className="px-4 py-3 font-bold text-[#287C78]">{c.complaints_count || 0}</td>
                        <td className="px-4 py-3 text-[#64748B]">
                          {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RESOLUTION VERIFICATION */}
          {activeTab === 'verifications' && (
            <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#193B50] uppercase tracking-wider">Resolution Proofs &amp; Verification Queue</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Audit evidence notes submitted by departments and inspect citizen feedback.</p>
              </div>

              <div className="space-y-4">
                {verificationsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">No resolution evidence records found.</div>
                ) : (
                  verificationsList.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#DCE5E9] bg-[#F4F7F8]/50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-xs text-[#193B50] bg-white px-2 py-0.5 rounded border border-[#DCE5E9]">
                            {item.complaint_code}
                          </span>
                          <h4 className="font-bold text-sm text-[#193B50] mt-1">{item.title}</h4>
                          <p className="text-xs text-[#64748B]">Resident: {item.citizen_name} ({item.citizen_mobile})</p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            item.verified_by_citizen === 1
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.verified_by_citizen === -1
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.verified_by_citizen === 1 ? 'Citizen Confirmed' : item.verified_by_citizen === -1 ? 'Citizen Reopened' : 'Pending Citizen Review'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-[#DCE5E9] text-xs space-y-1">
                        <span className="font-bold text-[#193B50] block">Official Department Resolution Notes:</span>
                        <p className="text-[#253746] leading-relaxed">{item.resolution_notes}</p>
                      </div>

                      {item.citizen_feedback && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs space-y-1">
                          <span className="font-bold text-red-900 block">Citizen Reopen Feedback:</span>
                          <p className="text-red-800 leading-relaxed">{item.citizen_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ESCALATIONS */}
          {activeTab === 'escalations' && (
            <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#193B50] uppercase tracking-wider">Supervisory Escalation Alerts</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Complaints escalated by citizens due to SLA delays or emergency conditions.</p>
              </div>

              <div className="space-y-3">
                {escalationsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">No escalated complaints currently active.</div>
                ) : (
                  escalationsList.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl border border-red-300 bg-red-50/40 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-xs text-[#193B50] bg-white px-2 py-0.5 rounded border border-[#DCE5E9]">
                            {c.complaint_code}
                          </span>
                          <h4 className="font-bold text-sm text-[#193B50] mt-1">{c.title}</h4>
                          <span className="text-xs text-[#64748B]">Dept: {c.department_name} • Priority: {c.priority}</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                          ESCALATED
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-red-200 text-xs">
                        <span className="font-bold text-red-900 block mb-0.5">Citizen Escalation Reason:</span>
                        <p className="text-red-800 leading-relaxed">{c.latest_escalation_reason || c.escalation_reason}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: CIVIC INTELLIGENCE DASHBOARD (PHASE 1) */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Multidimensional Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-2xs flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-[#193B50] flex items-center gap-1.5 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-[#287C78]" />
                  Filters:
                </span>

                <select
                  value={analyticsFilterState}
                  onChange={(e) => {
                    setAnalyticsFilterState(e.target.value);
                    setAnalyticsFilterDistrict('');
                  }}
                  className="px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-lg bg-[#F4F7F8] text-[#253746] font-medium"
                >
                  <option value="">All States / UTs</option>
                  {getAllStates().map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <select
                  value={analyticsFilterDistrict}
                  onChange={(e) => setAnalyticsFilterDistrict(e.target.value)}
                  disabled={!analyticsFilterState}
                  className="px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-lg bg-[#F4F7F8] text-[#253746] font-medium disabled:opacity-50"
                >
                  <option value="">{analyticsFilterState ? 'All Districts' : 'Select State'}</option>
                  {getDistrictsForState(analyticsFilterState).map((dst) => (
                    <option key={dst} value={dst}>{dst}</option>
                  ))}
                </select>

                <select
                  value={analyticsFilterWard}
                  onChange={(e) => setAnalyticsFilterWard(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-lg bg-[#F4F7F8] text-[#253746] font-medium"
                >
                  <option value="">All Municipal Wards (Kota)</option>
                  <option value="Ward 14 (Aerodrome / Vigyan Nagar)">Ward 14 (Aerodrome / Vigyan Nagar)</option>
                  <option value="Ward 8 (Nayapura / MBS Hospital)">Ward 8 (Nayapura / MBS Hospital)</option>
                  <option value="Ward 22 (Talwandi / Commerce College)">Ward 22 (Talwandi / Commerce College)</option>
                  <option value="Ward 31 (Rangbari / Mahaveer Nagar)">Ward 31 (Rangbari / Mahaveer Nagar)</option>
                  <option value="Ward 45 (Kunhari / Landmark City)">Ward 45 (Kunhari / Landmark City)</option>
                  <option value="Ward 12 (Gumanpura / Indira Market)">Ward 12 (Gumanpura / Indira Market)</option>
                  <option value="Ward 19 (Dadabari / Shastri Nagar)">Ward 19 (Dadabari / Shastri Nagar)</option>
                  <option value="Ward 16 (Chawani / Shopping Centre)">Ward 16 (Chawani / Shopping Centre)</option>
                  <option value="Ward 24 (Jawahar Nagar / City Park)">Ward 24 (Jawahar Nagar / City Park)</option>
                  <option value="Ward 52 (Borkhera / Baran Road)">Ward 52 (Borkhera / Baran Road)</option>
                </select>

                <select
                  value={analyticsFilterCategory}
                  onChange={(e) => setAnalyticsFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-lg bg-[#F4F7F8] text-[#253746] font-medium"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={analyticsFilterPriority}
                  onChange={(e) => setAnalyticsFilterPriority(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-lg bg-[#F4F7F8] text-[#253746] font-medium"
                >
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                {(analyticsFilterWard || analyticsFilterCategory || analyticsFilterPriority) && (
                  <button
                    onClick={() => {
                      setAnalyticsFilterWard('');
                      setAnalyticsFilterCategory('');
                      setAnalyticsFilterPriority('');
                    }}
                    className="text-xs text-[#287C78] hover:underline font-bold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {analyticsData ? (
                <>
                  {/* Top Aggregate KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
                      <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Total Complaints</span>
                      <span className="text-2xl font-extrabold text-[#193B50] block mt-1">{analyticsData.totalComplaints}</span>
                      <span className="text-[10px] text-[#287C78] font-medium">In selected view</span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
                      <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Resolution Rate</span>
                      <span className="text-2xl font-extrabold text-[#328568] block mt-1">{analyticsData.resolutionRate}%</span>
                      <span className="text-[10px] text-[#328568] font-medium">{analyticsData.resolvedComplaints} resolved</span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
                      <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Pending Grievances</span>
                      <span className="text-2xl font-extrabold text-[#D49A37] block mt-1">{analyticsData.pendingComplaints}</span>
                      <span className="text-[10px] text-[#D49A37] font-medium">Requiring field action</span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
                      <span className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Overdue (SLA Breached)</span>
                      <span className={`text-2xl font-extrabold block mt-1 ${analyticsData.overdueComplaintsCount > 0 ? 'text-[#C65B5B]' : 'text-[#328568]'}`}>
                        {analyticsData.overdueComplaintsCount}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-medium">Statutory SLA breaches</span>
                    </div>
                  </div>

                  {/* CIVIC INSIGHTS SECTION (DATA-DRIVEN OBSERVATIONS) */}
                  {analyticsData.civicInsights && analyticsData.civicInsights.length > 0 && (
                    <div className="bg-[#193B50] text-white p-6 rounded-2xl border border-[#254A63] shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#D6A64F]">
                          <Sparkles className="w-4 h-4 text-[#D6A64F]" />
                          Civic Insights (Automated Real-Data Observations)
                        </h3>
                        <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded font-mono text-[#DCE5E9]">
                          Nagar Nigam Kota Intelligence Engine
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {analyticsData.civicInsights.map((insight, idx) => (
                          <div key={idx} className="p-3.5 bg-white/10 rounded-xl border border-white/15 flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#D6A64F] mt-1.5 shrink-0" />
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-white">{insight.title}</span>
                                {insight.metric && (
                                  <span className="text-[10px] font-mono font-bold bg-[#287C78] px-1.5 py-0.2 rounded text-white">
                                    {insight.metric}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#DCE5E9] leading-relaxed">{insight.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2-Column: Ward-wise Distribution + Department Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ward-wise Complaint Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE5E9]">
                        <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider flex items-center gap-2">
                          <Building className="w-4 h-4 text-[#287C78]" />
                          Ward-wise Distribution
                        </h3>
                        <span className="text-[10px] text-[#64748B]">Click to explore</span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {analyticsData.wardCounts && analyticsData.wardCounts.length > 0 ? (
                          analyticsData.wardCounts.map((w, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setFilterCategory('');
                                setSearch(w.ward_name.replace(/Ward \d+ \((.*?)\)/, '$1'));
                                setActiveTab('complaints');
                              }}
                              className="p-3 rounded-lg bg-[#F4F7F8] hover:bg-white border border-[#DCE5E9] cursor-pointer transition-all flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#193B50] block">{w.ward_name}</span>
                                <span className="text-[10px] text-[#64748B]">{w.pending_count} pending • {w.resolved_count} resolved</span>
                              </div>
                              <span className="font-mono font-bold text-sm text-[#193B50] bg-white px-2 py-0.5 rounded border border-[#DCE5E9]">
                                {w.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#64748B] text-center p-4">No ward records match selected filters.</p>
                        )}
                      </div>
                    </div>

                    {/* Department Performance & Resolution Times */}
                    <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE5E9]">
                        <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#D6A64F]" />
                          Department Resolution Efficiency
                        </h3>
                        <span className="text-[10px] text-[#64748B]">Hours to Resolve</span>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto">
                        {analyticsData.departmentPerformance && analyticsData.departmentPerformance.length > 0 ? (
                          analyticsData.departmentPerformance.map((dept, i) => (
                            <div key={i} className="p-3 rounded-lg bg-[#F4F7F8] border border-[#DCE5E9] text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#193B50]">{dept.department_name}</span>
                                <span className="text-[11px] font-semibold text-[#287C78]">
                                  {dept.avg_resolution_hours ? `${dept.avg_resolution_hours}h avg` : 'Awaiting closures'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                                <span>Pending: {dept.pending_count} tickets</span>
                                <span>Resolved: {dept.resolved_count}</span>
                                <span>Total: {dept.total_assigned}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#64748B] text-center p-4">No departmental metrics available.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown & Monthly Volume Trend */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                      <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
                        Domain Category Distribution
                      </h3>
                      <div className="space-y-2">
                        {analyticsData.categoryCounts && analyticsData.categoryCounts.map((cat, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setFilterCategory(cat.id);
                              setActiveTab('complaints');
                            }}
                            className="flex justify-between items-center text-xs p-2.5 rounded-lg hover:bg-[#F4F7F8] cursor-pointer transition-colors"
                          >
                            <span className="font-medium text-[#253746]">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[#DCE5E9] rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-[#287C78]"
                                  style={{ width: `${Math.round((cat.count / (analyticsData.totalComplaints || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="font-bold text-[#193B50] font-mono bg-[#F4F7F8] px-2 py-0.5 rounded border border-[#DCE5E9]">
                                {cat.count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* High Priority Locations Queue */}
                    <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE5E9]">
                        <h3 className="text-xs font-bold text-[#C65B5B] uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#C65B5B]" />
                          High &amp; Critical Priority Queue
                        </h3>
                        <span className="text-[10px] text-[#64748B]">Immediate Action Required</span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {analyticsData.highPriorityLocations && analyticsData.highPriorityLocations.length > 0 ? (
                          analyticsData.highPriorityLocations.map((hp) => (
                            <div
                              key={hp.id}
                              onClick={() => {
                                setSearch(hp.code);
                                setActiveTab('complaints');
                              }}
                              className="p-3 bg-red-50/40 rounded-lg border border-red-200 cursor-pointer hover:bg-red-50 transition-colors text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-[#193B50]">{hp.code}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-600 text-white">
                                  {hp.priority}
                                </span>
                              </div>
                              <h4 className="font-bold text-[#193B50] line-clamp-1">{hp.title}</h4>
                              <p className="text-[10px] text-[#64748B]">📍 {hp.address} ({hp.ward})</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#64748B] text-center p-4">No active critical or high-priority complaints pending.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-xs text-[#64748B]">
                  {analyticsLoading ? 'Recalculating civic intelligence metrics...' : 'Loading analytics...'}
                </div>
              )}
            </div>
          )}

          {/* TAB: RECURRING ISSUE HOTSPOTS MAP (PHASE 2) */}
          {activeTab === 'hotspots' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#193B50] flex items-center gap-2">
                      <Repeat className="w-5 h-5 text-[#C65B5B]" />
                      Recurring Civic Issue Hotspots &amp; Spatial Clusters
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Identifies chronic infrastructure bottlenecks reported within 350m radii across municipal jurisdictions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-50 text-[#C65B5B] border border-red-200 rounded-lg text-xs font-bold font-mono">
                      {recurringHotspots.length} Active Hotspot Clusters
                    </span>
                  </div>
                </div>

                {/* Spatial Map Display */}
                <div className="space-y-1">
                  <CivicMap
                    complaints={complaints}
                    hotspots={recurringHotspots}
                    height="460px"
                    showHotspots={true}
                    onSelectComplaint={(c) => {
                      setSelectedComplaint(c);
                      setModalAction('status');
                    }}
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B] px-1 font-medium">
                    <span>🔴 Red circles denote recurring 350m spatial clusters</span>
                    <span>Pinpoints chronic maintenance bottlenecks</span>
                  </div>
                </div>
              </div>

              {/* Hotspot Clusters Breakdown Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
                  Algorithmic Cluster Diagnostics &amp; Municipal Recommendations
                </h3>

                {recurringHotspots.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-[#DCE5E9] text-center text-xs text-[#64748B]">
                    No recurring hotspots detected within the current geographic filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurringHotspots.map((spot, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-5 rounded-2xl border border-[#DCE5E9] shadow-2xs hover:border-[#287C78] transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#C65B5B] uppercase tracking-wider block">
                              Cluster #{idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-[#193B50]">{spot.categoryName} Cluster</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#193B50] text-[#D6A64F] font-mono">
                            {spot.totalComplaints} Reports
                          </span>
                        </div>

                        <div className="text-xs space-y-1.5 text-[#64748B]">
                          <p className="flex items-center gap-1.5 text-[#253746]">
                            <MapPin className="w-3.5 h-3.5 text-[#287C78] shrink-0" />
                            <span className="font-semibold">Area:</span> {spot.approximateArea || 'Municipal Sector'}
                          </p>
                          <div className="bg-[#F4F7F8] p-3 rounded-xl border border-[#DCE5E9] text-xs">
                            <span className="font-bold text-[#193B50] block mb-1">
                              📋 Municipal Action Recommendation:
                            </span>
                            <p className="text-[#253746] leading-relaxed">{spot.recommendedAction}</p>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-between items-center text-xs border-t border-[#DCE5E9]/60">
                          <span className="text-[11px] text-[#64748B]">Radius: ~350m spatial cluster</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSearch(spot.approximateArea || spot.categoryName);
                              setActiveTab('complaints');
                            }}
                            className="text-[#287C78] hover:underline font-bold text-xs"
                          >
                            View Complaints &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#193B50] uppercase tracking-wider">System &amp; SLA Configuration</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Municipal operational parameters for CodeCivic Kota platform.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg border border-[#DCE5E9]">
                  <div>
                    <span className="font-bold text-[#193B50] block">Jurisdiction Focus</span>
                    <span className="text-[#64748B]">Active operational city</span>
                  </div>
                  <span className="font-bold text-[#287C78]">Kota, Rajasthan</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg border border-[#DCE5E9]">
                  <div>
                    <span className="font-bold text-[#193B50] block">Database Engine</span>
                    <span className="text-[#64748B]">Persistent SQLite WAL Mode</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">CONNECTED (codecivic.db)</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg border border-[#DCE5E9]">
                  <div>
                    <span className="font-bold text-[#193B50] block">Standard SLA Deadlines</span>
                    <span className="text-[#64748B]">Critical: 24h • High: 48h • Medium: 72h • Low: 120h</span>
                  </div>
                  <span className="font-bold text-[#193B50]">ENFORCED</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: ASSIGN DEPARTMENT & PRIORITY */}
      {modalAction === 'assign' && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE5E9] space-y-4 text-xs animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE5E9]">
              <h3 className="font-bold text-sm text-[#193B50]">
                Route Complaint ({selectedComplaint.complaint_code})
              </h3>
              <button onClick={() => setModalAction(null)} className="text-[#64748B] hover:text-[#193B50]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 text-[#C65B5B] rounded-lg border border-red-200">{actionError}</div>
            )}

            <form onSubmit={handleAssignDepartment} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Assign Responsible Department</label>
                <select
                  required
                  value={assignDeptId}
                  onChange={(e) => setAssignDeptId(e.target.value)}
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg bg-white text-[#253746]"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (SLA: {d.sla_hours_default}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Set Priority</label>
                <select
                  required
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg bg-white text-[#253746]"
                >
                  <option value="LOW">LOW (120h target)</option>
                  <option value="MEDIUM">MEDIUM (72h target)</option>
                  <option value="HIGH">HIGH (48h target)</option>
                  <option value="CRITICAL">CRITICAL (24h urgent)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Routing Remarks (Optional)</label>
                <input
                  type="text"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Dispatched to Vigyan Nagar maintenance squad"
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE5E9]">
                <button
                  type="button"
                  onClick={() => setModalAction(null)}
                  className="px-4 py-2 border rounded-lg text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-[#193B50] text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submittingAction ? 'Updating...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE STATUS */}
      {modalAction === 'status' && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE5E9] space-y-4 text-xs animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE5E9]">
              <h3 className="font-bold text-sm text-[#193B50]">
                Update Status ({selectedComplaint.complaint_code})
              </h3>
              <button onClick={() => setModalAction(null)} className="text-[#64748B] hover:text-[#193B50]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 text-[#C65B5B] rounded-lg border border-red-200">{actionError}</div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#193B50] mb-1">New Status</label>
                <select
                  required
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg bg-white text-[#253746]"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Official Remarks *</label>
                <textarea
                  rows={3}
                  required
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Record justification and action details..."
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE5E9]">
                <button
                  type="button"
                  onClick={() => setModalAction(null)}
                  className="px-4 py-2 border rounded-lg text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-[#193B50] text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submittingAction ? 'Saving...' : 'Update & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD RESOLUTION EVIDENCE */}
      {modalAction === 'resolve' && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#DCE5E9] space-y-4 text-xs animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE5E9]">
              <h3 className="font-bold text-sm text-[#193B50]">
                Upload Resolution Evidence ({selectedComplaint.complaint_code})
              </h3>
              <button onClick={() => setModalAction(null)} className="text-[#64748B] hover:text-[#193B50]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 text-[#C65B5B] rounded-lg border border-red-200">{actionError}</div>
            )}

            <form onSubmit={handleResolveWithEvidence} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#193B50] mb-1">
                  Resolution Notes (Min 15 chars) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail the remedial maintenance work executed on-site..."
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#193B50] mb-1">
                  Upload Completion Photograph (Evidence Proof)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setEvidenceFile(e.target.files[0] || null)}
                  className="w-full text-xs text-[#64748B] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#287C78]/15 file:text-[#287C78] hover:file:bg-[#287C78]/25"
                />
              </div>

              <div className="p-3 bg-emerald-50 text-[#1F5441] rounded-lg border border-[#328568]/30 text-[11px]">
                Upon resolution submission, the complaint moves to <span className="font-bold">RESOLVED</span> and an instant notification is dispatched to the citizen for on-ground verification.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE5E9]">
                <button
                  type="button"
                  onClick={() => setModalAction(null)}
                  className="px-4 py-2 border rounded-lg text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || resolutionNotes.trim().length < 15}
                  className="px-5 py-2 bg-[#287C78] text-white rounded-lg font-bold hover:bg-[#1F6360] disabled:opacity-50"
                >
                  {submittingAction ? 'Uploading Evidence...' : 'Submit Resolution Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE5E9] space-y-4 text-xs animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE5E9]">
              <h3 className="font-bold text-sm text-[#193B50]">Register Municipal Department</h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-[#64748B] hover:text-[#193B50]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDeptData.name}
                  onChange={(e) => setNewDeptData({ ...newDeptData, name: e.target.value })}
                  placeholder="e.g. Chambal Riverfront Maintenance"
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#193B50] mb-1">Description</label>
                <input
                  type="text"
                  value={newDeptData.description}
                  onChange={(e) => setNewDeptData({ ...newDeptData, description: e.target.value })}
                  placeholder="Scope of municipal works"
                  className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#193B50] mb-1">Officer in Charge</label>
                  <input
                    type="text"
                    value={newDeptData.head_officer}
                    onChange={(e) => setNewDeptData({ ...newDeptData, head_officer: e.target.value })}
                    placeholder="Chief Engineer"
                    className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#193B50] mb-1">Default SLA (Hours)</label>
                  <input
                    type="number"
                    value={newDeptData.sla_hours_default}
                    onChange={(e) => setNewDeptData({ ...newDeptData, sla_hours_default: parseInt(e.target.value) || 48 })}
                    className="w-full p-2.5 border border-[#DCE5E9] rounded-lg text-[#253746]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE5E9]">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border rounded-lg text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#193B50] text-white rounded-lg font-bold"
                >
                  Register Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
