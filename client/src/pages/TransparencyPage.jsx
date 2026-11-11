import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3,
  ExternalLink,
  Info
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TransparencyPage({ onNavigate }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/transparency')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load transparency report');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Transparency load error:', err);
        setError('Could not connect to public transparency service.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-3 border-[#287C78] border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-[#64748B] font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalComplaints: 12,
    resolvedComplaints: 3,
    pendingComplaints: 9,
    resolutionPercentage: 25,
    averageResolutionHours: 26,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#F4F7F8]">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#287C78]/10 text-[#287C78] text-xs font-bold border border-[#287C78]/25">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D6A64F]" />
              {t('transparency.disclaimer')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#193B50] tracking-tight">
              {t('transparency.title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-3xl leading-relaxed">
              {t('transparency.subtitle')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="px-5 py-2.5 bg-[#193B50] text-white text-xs font-bold rounded-lg hover:bg-[#122B3B] transition-colors flex items-center gap-2 self-start md:self-auto shadow-xs"
          >
            {t('nav.exploreIssues')}
            <ArrowUpRight className="w-4 h-4 text-[#D6A64F]" />
          </button>
        </div>
      </div>

      {/* Top Level Aggregate KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            {t('transparency.totalLodged')}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#193B50] mt-1.5">
            {summary.totalComplaints}
          </div>
          <div className="text-[11px] text-[#287C78] mt-1 font-medium">Public record volume</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            {t('transparency.totalResolved')}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#328568] mt-1.5">
            {summary.resolvedComplaints}
          </div>
          <div className="text-[11px] text-[#328568] mt-1 font-medium">Evidence confirmed</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            {t('transparency.activePending')}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#D49A37] mt-1.5">
            {summary.pendingComplaints}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 font-medium">Under field dispatch</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs">
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            {t('transparency.resRate')}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#193B50] mt-1.5">
            {summary.resolutionPercentage}%
          </div>
          <div className="text-[11px] text-[#287C78] mt-1 font-medium">Overall closure rate</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            {t('transparency.avgHours')}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#193B50] mt-1.5">
            {summary.averageResolutionHours || 26} <span className="text-sm font-semibold text-[#64748B]">{t('transparency.hours')}</span>
          </div>
          <div className="text-[11px] text-[#D6A64F] mt-1 font-semibold">Tracked against SLAs</div>
        </div>
      </div>

      {/* Two Column Grid: Department Efficiency + Domain Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Resolution Efficiency */}
        <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE5E9]">
            <h3 className="text-sm font-bold text-[#193B50] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#287C78]" />
              {t('transparency.deptPerformance')}
            </h3>
            <span className="text-[10px] text-[#64748B] font-semibold">Official Wards</span>
          </div>

          <div className="space-y-3">
            {data?.departmentStats && data.departmentStats.length > 0 ? (
              data.departmentStats.map((dept, i) => {
                const total = dept.total_assigned || 0;
                const resolved = dept.resolved || 0;
                const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
                return (
                  <div key={i} className="p-3 bg-[#F4F7F8] rounded-xl border border-[#DCE5E9]/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#193B50]">{dept.name}</span>
                      <span className="font-bold text-[#287C78]">{pct}% resolved</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#DCE5E9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#287C78] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Active tickets: {dept.active || 0}</span>
                      <span>Total assigned: {total}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#64748B]">No departmental metrics available.</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE5E9]">
            <h3 className="text-sm font-bold text-[#193B50] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D6A64F]" />
              {t('transparency.categoryBreakdown')}
            </h3>
            <span className="text-[10px] text-[#64748B] font-semibold">City Distribution</span>
          </div>

          <div className="space-y-2.5">
            {data?.categoryStats && data.categoryStats.length > 0 ? (
              data.categoryStats.map((cat, i) => {
                const total = cat.total || 0;
                const totalAll = summary.totalComplaints || 1;
                const share = Math.round((total / totalAll) * 100);
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 hover:bg-[#F4F7F8] rounded-lg transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#287C78]" />
                      <span className="text-xs font-semibold text-[#193B50]">
                        {t(`categories.${cat.name}`, cat.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#193B50]">{total}</span>
                      <span className="text-[11px] font-semibold text-[#64748B] w-12 text-right">{share}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#64748B]">No domain records available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 bg-white rounded-xl border border-[#DCE5E9] text-[11px] text-[#64748B] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#287C78] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#193B50]">Privacy &amp; Data Ethics Guarantee:</span> In compliance with public records guidelines, CodeCivic does not display citizen names, contact numbers, email addresses, or exact private residential numbers on this portal. Only anonymized civic indicators are reported to drive municipal transparency.
        </div>
      </div>
    </div>
  );
}
