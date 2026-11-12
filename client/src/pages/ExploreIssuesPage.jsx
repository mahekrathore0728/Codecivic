import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CivicMap from '../components/CivicMap';
import {
  Search,
  Filter,
  MapPin,
  List,
  Map as MapIcon,
  ThumbsUp,
  Clock,
  AlertCircle,
  ExternalLink,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { getAllStates, getDistrictsForState } from '../utils/indiaGeoData';

export default function ExploreIssuesPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, authFetch } = useAuth();

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Selected complaint on map click
  const [activeComplaint, setActiveComplaint] = useState(null);

  // Fetch Categories
  useEffect(() => {
    fetch('/api/complaints/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setCategories(d.categories);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch Complaints
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (selectedState) params.append('state', selectedState);
      if (selectedDistrict) params.append('district', selectedDistrict);

      if (nearbyOnly && userCoords) {
        params.append('nearby_lat', userCoords.lat);
        params.append('nearby_lng', userCoords.lng);
        params.append('radius_km', 25);
      }

      params.append('limit', 50);

      const res = await authFetch(`/api/complaints?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, selectedPriority, selectedState, selectedDistrict, nearbyOnly, userCoords, authFetch]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle Nearby Filter Toggle
  const handleToggleNearby = () => {
    if (!nearbyOnly) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setNearbyOnly(true);
          },
          () => {
            // Fallback: geographic center of India
            setUserCoords({ lat: 20.5937, lng: 78.9629 });
            setNearbyOnly(true);
          }
        );
      } else {
        setUserCoords({ lat: 20.5937, lng: 78.9629 });
        setNearbyOnly(true);
      }
    } else {
      setNearbyOnly(false);
    }
  };

  // Support / Unsupport
  const handleToggleSupport = async (complaint) => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    try {
      const endpoint = `/api/complaints/${complaint.id}/support`;
      const method = complaint.hasSupported ? 'DELETE' : 'POST';

      const res = await authFetch(endpoint, { method });
      if (res.ok) {
        const data = await res.json();
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === complaint.id
              ? { ...c, support_count: data.supportCount, hasSupported: data.hasSupported }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Support error:', err);
    }
  };

  // Attractive but restrained status labels using the new palette
  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#F4F7F8] text-[#253746] border border-[#DCE5E9]">
            SUBMITTED
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#D49A37]/15 text-[#9E6E1F] border border-[#D49A37]/30">
            UNDER REVIEW
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#287C78]/15 text-[#287C78] border border-[#287C78]/30">
            ASSIGNED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#193B50]/10 text-[#193B50] border border-[#193B50]/20">
            IN PROGRESS
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#328568]/15 text-[#328568] border border-[#328568]/30">
            RESOLVED
          </span>
        );
      case 'REOPENED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#C65B5B]/15 text-[#C65B5B] border border-[#C65B5B]/30">
            REOPENED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#328568]/20 text-[#1F5441] border border-[#328568]/40">
            CLOSED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#F4F7F8]">
      
      {/* Top Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#193B50] tracking-tight">Explore Community Issues</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Discover verified civic complaints from citizens across India • Lend community support and track resolution.
          </p>
        </div>

        {/* View Toggle (List vs Map) */}
        <div className="flex items-center bg-white border border-[#DCE5E9] rounded-lg p-1 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-[#193B50] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#193B50]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'map'
                ? 'bg-[#193B50] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#193B50]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Interactive Map
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE5E9] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keywords, ID or locality..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] text-[#253746]"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
              }}
              className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
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
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746] disabled:opacity-50"
            >
              <option value="">{selectedState ? 'All Districts' : 'Select State first'}</option>
              {getDistrictsForState(selectedState).map((dst) => (
                <option key={dst} value={dst}>{dst}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
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
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#DCE5E9]/60 gap-2">
          <div className="flex items-center gap-3">
            <span>Showing {complaints.length} of {totalCount} verified grievances</span>
            <button
              onClick={handleToggleNearby}
              className={`py-1 px-2.5 text-[11px] font-bold rounded border flex items-center gap-1 transition-colors ${
                nearbyOnly
                  ? 'bg-[#287C78] text-white border-[#287C78]'
                  : 'bg-[#F4F7F8] text-[#193B50] border-[#DCE5E9] hover:bg-white'
              }`}
            >
              <MapPin className="w-3 h-3" />
              {nearbyOnly ? 'Near Me (Active)' : 'Near Me'}
            </button>
          </div>

          {(search || selectedCategory || selectedStatus || selectedPriority || selectedState || selectedDistrict || nearbyOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedStatus('');
                setSelectedPriority('');
                setSelectedState('');
                setSelectedDistrict('');
                setNearbyOnly(false);
              }}
              className="text-[#287C78] hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* VIEW: MAP MODE */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <CivicMap
            complaints={complaints}
            zoom={13}
            height="500px"
            onSelectComplaint={(c) => setActiveComplaint(c)}
          />

          {activeComplaint && (
            <div className="p-4 bg-white rounded-xl border border-[#193B50] shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-xs text-[#193B50] bg-[#F4F7F8] px-2 py-0.5 rounded border border-[#DCE5E9]">
                    {activeComplaint.complaint_code}
                  </span>
                  {getStatusBadge(activeComplaint.status)}
                </div>
                <h4 className="text-sm font-bold text-[#193B50]">{activeComplaint.title}</h4>
                <p className="text-xs text-[#64748B]">📍 {activeComplaint.address} • {activeComplaint.district}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSupport(activeComplaint)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${
                    activeComplaint.hasSupported
                      ? 'bg-[#287C78] text-white border-[#287C78]'
                      : 'bg-white border-[#DCE5E9] text-[#193B50] hover:bg-[#F4F7F8]'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {activeComplaint.hasSupported ? 'Supported' : 'Support'} ({activeComplaint.support_count || 0})
                </button>
                <button
                  onClick={() => onNavigate('track', activeComplaint.complaint_code)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#193B50] text-white hover:bg-[#122B3B]"
                >
                  Track Details
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: LIST MODE (POLISHED COMPLAINT CARDS) */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-xl border border-[#DCE5E9]">
              Loading civic complaints...
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-xl border border-[#DCE5E9]">
              No complaints found matching the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-[#DCE5E9] p-5 shadow-2xs hover:border-[#193B50] transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Sequential ID, Status Badge, Reporting Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#193B50] bg-[#F4F7F8] px-2.5 py-0.5 rounded-md border border-[#DCE5E9]">
                          {c.complaint_code}
                        </span>
                        {getStatusBadge(c.status)}
                      </div>
                      <span className="text-[11px] text-[#64748B] whitespace-nowrap font-medium">
                        {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Category Label */}
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#287C78]">
                      {c.category_name}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-[#193B50] leading-snug">{c.title}</h3>
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{c.description}</p>
                    
                    {/* Location Info */}
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B] pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#287C78] shrink-0" />
                      <span className="truncate">{c.address}, {c.district}</span>
                      {c.distanceMeters != null && (
                        <span className="text-[10px] text-[#287C78] font-bold shrink-0">
                          ({c.distanceMeters > 1000 ? (c.distanceMeters / 1000).toFixed(1) + 'km' : c.distanceMeters + 'm'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer: Support & Track Progress */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#DCE5E9]/60">
                    <button
                      onClick={() => handleToggleSupport(c)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        c.hasSupported
                          ? 'bg-[#287C78] text-white border-[#287C78]'
                          : 'bg-[#F4F7F8] border-[#DCE5E9] text-[#193B50] hover:bg-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {c.hasSupported ? 'Supported' : 'Support'} ({c.support_count || 0})
                    </button>

                    <button
                      onClick={() => onNavigate('track', c.complaint_code)}
                      className="text-xs text-[#193B50] font-bold hover:text-[#287C78] flex items-center gap-1 transition-colors"
                    >
                      Track Progress
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
