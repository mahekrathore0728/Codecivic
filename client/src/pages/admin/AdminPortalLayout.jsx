import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  ExternalLink,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  User,
  LayoutDashboard,
  Layers,
  Building,
  Users,
  BarChart3,
  MapPin,
  FileWarning,
  FileCheck,
  Sliders,
  Menu,
  X,
} from 'lucide-react';
import AdminDashboardPage from '../AdminDashboardPage';

export default function AdminPortalLayout({ currentPath = '/admin/dashboard', onNavigate }) {
  const { user, isAdmin, isAuthenticated, loading, logout } = useAuth();
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));

  // Live IST Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Map admin URL paths to tab keys
  const pathToTab = {
    '/admin/dashboard': 'overview',
    '/admin/complaints': 'complaints',
    '/admin/departments': 'departments',
    '/admin/citizens': 'citizens',
    '/admin/analytics': 'analytics',
    '/admin/hotspots': 'hotspots',
    '/admin/escalations': 'escalations',
    '/admin/settings': 'settings',
    '/admin/verifications': 'verifications',
    '/admin': 'overview',
  };

  const tabToPath = {
    'overview': '/admin/dashboard',
    'complaints': '/admin/complaints',
    'departments': '/admin/departments',
    'citizens': '/admin/citizens',
    'analytics': '/admin/analytics',
    'hotspots': '/admin/hotspots',
    'escalations': '/admin/escalations',
    'settings': '/admin/settings',
    'verifications': '/admin/verifications',
  };

  const activeTab = pathToTab[currentPath] || 'overview';

  // Handle tab switch by pushing route
  const handleTabChange = (tabId) => {
    const targetRoute = tabToPath[tabId] || '/admin/dashboard';
    onNavigate(targetRoute);
  };

  // If loading auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#112431] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
          <Shield className="w-6 h-6 text-[#D6A64F]" />
        </div>
        <p className="text-xs text-slate-400 font-mono">Verifying Administrative Privileges...</p>
      </div>
    );
  }

  // If not authenticated, redirect/show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#112431] flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#193B50] border border-[#2B546E] rounded-2xl p-8 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#D6A64F]" />
          </div>
          <h2 className="text-lg font-bold">Authentication Required</h2>
          <p className="text-xs text-slate-300">
            You must be logged in as an authorized municipal administrator to view this portal.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('/admin/login')}
              className="w-full py-2.5 bg-[#287C78] hover:bg-[#1E5F5C] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Go to Admin Login
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 border border-white/10 hover:border-white/30 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Return to Citizen Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated but citizen role (RBAC strict check)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#112431] flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#193B50] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Administrative Access Restricted</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account (<span className="text-amber-300 font-mono">{user?.email}</span>) holds a <span className="font-bold text-white">CITIZEN</span> role.
            Administrative routes and APIs are strictly restricted to municipal officers.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 bg-[#287C78] hover:bg-[#1E5F5C] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Return to Citizen Portal
            </button>
            <button
              onClick={() => {
                logout();
                onNavigate('/admin/login');
              }}
              className="w-full py-2.5 border border-white/10 hover:border-white/30 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Log Out and Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex flex-col selection:bg-[#287C78] selection:text-white">
      {/* OFFICIAL ADMINISTRATIVE COMMAND HEADER */}
      <header className="sticky top-0 z-50 bg-[#122B3B] text-white border-b border-[#224A63] shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Emblem & Command Center Brand */}
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => handleTabChange('overview')}
            >
              <img src="/logo-icon.svg" alt="CodeCivic" className="w-10 h-10 rounded-xl shadow-xs" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-wide text-white">CodeCivic</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D6A64F]/20 text-[#D6A64F] border border-[#D6A64F]/40">
                    Admin Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-none">
                  Municipal Command &amp; Intelligence Directorate
                </p>
              </div>
            </div>

            {/* Center: Live System Status & IST Clock */}
            <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span className="font-mono text-[11px] text-white">{systemTime} IST</span>
              </div>
              <div className="h-3 w-px bg-white/20"></div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                <span className="font-semibold">WAL Active • Online</span>
              </div>
            </div>

            {/* Right: Officer Profile, Citizen Switch, and Logout */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors border border-white/15"
                title="Switch to public citizen facing site"
              >
                <span>Citizen View</span>
                <ExternalLink className="w-3 h-3 text-[#D6A64F]" />
              </button>

              {/* Officer Badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/15">
                <div className="w-8 h-8 rounded-full bg-[#287C78] border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">{user?.name}</p>
                  <p className="text-[10px] text-[#D6A64F] uppercase tracking-wider font-bold">
                    {user?.role === 'STATE_ADMIN' && 'State Admin'}
                    {user?.role === 'DISTRICT_ADMIN' && 'District Admin'}
                    {user?.role === 'LOCAL_BODY_ADMIN' && 'Municipal Admin'}
                    {user?.role === 'DEPARTMENT_ADMIN' && 'Dept Head'}
                    {user?.role === 'FIELD_OFFICER' && 'Field Officer'}
                    {(user?.role === 'ADMIN' || user?.role === 'NATIONAL_SUPER_ADMIN') && 'Super Admin'}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  logout();
                  onNavigate('/admin/login');
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Secure Sign Out"
              >
                <LogOut className="w-4 h-4 text-red-300" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Embedded Admin Dashboard Engine with Path Synchronization */}
      <main className="flex-1">
        <AdminDashboardPage
          activeTabProp={activeTab}
          onTabChange={handleTabChange}
          onNavigate={onNavigate}
        />
      </main>

      {/* Official Admin Footer */}
      <footer className="border-t border-[#DCE5E9] bg-white px-6 py-4 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CodeCivic Civic Intelligence &amp; Municipal Work Order Management System</span>
          <span className="font-mono text-[11px] text-[#287C78]">ISO 27001 &amp; IT Act 2000 Compliant Architecture</span>
        </div>
      </footer>
    </div>
  );
}
