import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Building2,
  KeyRound,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function AdminLoginPage({ onNavigate }) {
  const { user, isAdmin, isAuthenticated, login, setAuthSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Evaluator-only authentication state
  const [evaluatorKey, setEvaluatorKey] = useState('');
  const [evaluatorLoading, setEvaluatorLoading] = useState(false);
  const [showEvaluatorMode, setShowEvaluatorMode] = useState(true);

  // If already logged in as Admin, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      onNavigate('/admin/dashboard');
    }
  }, [isAuthenticated, isAdmin, onNavigate]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      if (loggedInUser.role !== 'ADMIN') {
        setError('Access Denied: This account does not possess municipal administrator privileges.');
        return;
      }
      onNavigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Administrative authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluatorLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setEvaluatorLoading(true);

    try {
      const keyToUse = evaluatorKey.trim();

      if (!keyToUse) {
        throw new Error('Please enter your evaluator access key.');
      }
      const res = await fetch('/api/auth/evaluator-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluatorKey: keyToUse }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Evaluator authentication failed.');
      }

      setAuthSession(data.token, data.user);
      onNavigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid evaluator access key. Access denied.');
    } finally {
      setEvaluatorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#112431] text-[#E2E8F0] flex flex-col justify-between selection:bg-[#287C78] selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-white/10 bg-[#0C1A24]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#287C78]/20 border border-[#287C78]/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#D6A64F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-wide">CodeCivic</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D6A64F]/20 text-[#D6A64F] border border-[#D6A64F]/40">
                Official Administration
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Municipal Governance &amp; Command Portal</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/')}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg"
        >
          <span>Return to Citizen Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#193B50] border border-[#2B546E] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative Gold Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#287C78] via-[#D6A64F] to-[#287C78]"></div>

          <div className="mb-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-inner">
              <Lock className="w-7 h-7 text-[#D6A64F]" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Command Center</h1>
            <p className="text-xs text-slate-300 mt-1">
              Restricted municipal access. Authorized personnel only.
            </p>
          </div>

          {/* Citizen Account Warning if logged in as citizen */}
          {isAuthenticated && !isAdmin && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Currently logged in as Citizen ({user?.email})</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Citizen accounts cannot access administrative command functions. Please authenticate with administrator credentials below.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Selector: Evaluator Access vs Official Officer Login */}
          <div className="flex rounded-xl bg-[#0F2636] p-1 border border-[#2B546E] mb-6">
            <button
              type="button"
              onClick={() => { setShowEvaluatorMode(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${showEvaluatorMode
                  ? 'bg-[#287C78] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D6A64F]" />
              <span>Evaluator Access</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowEvaluatorMode(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${!showEvaluatorMode
                  ? 'bg-[#193B50] text-white border border-[#2B546E] shadow-xs'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#D6A64F]" />
              <span>Officer Sign In</span>
            </button>
          </div>

          {/* Evaluator Access Mode (Passwordless for hackathon jury via secure server key) */}
          {showEvaluatorMode && (
            <form onSubmit={handleEvaluatorLogin} className="space-y-4">
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2 text-left">
                <span className="text-[11px] font-bold text-[#D6A64F] uppercase tracking-wider block">
                  Hackathon Evaluation Access
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Evaluators can access the full municipal governance console using the evaluation passkey.
                  Admin credentials are never exposed through client bundles or public APIs.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 text-left">
                  Evaluator Access Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={evaluatorKey}
                    onChange={(e) => setEvaluatorKey(e.target.value)}
                    placeholder="Enter your evaluator access key"
                    className="w-full px-4 py-2.5 bg-[#0F2636] border border-[#2B546E] focus:border-[#D6A64F] text-white text-xs rounded-xl outline-none transition-all placeholder:text-slate-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={evaluatorLoading}
                className="w-full py-3 bg-gradient-to-r from-[#287C78] to-[#1F6360] hover:from-[#1F6360] hover:to-[#174F4D] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 border border-teal-400/20 disabled:opacity-50"
              >
                {evaluatorLoading ? (
                  <span>Verifying Evaluator Key...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#D6A64F]" />
                    <span>Authenticate as Evaluator</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Official Officer Sign In Mode (Email + Password) */}
          {!showEvaluatorMode && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 text-left">
                  Official Administrative Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@codecivic.gov.in"
                  className="w-full px-4 py-2.5 bg-[#0F2636] border border-[#2B546E] focus:border-[#D6A64F] text-white text-xs rounded-xl outline-none transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 text-left">
                  Security Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-[#0F2636] border border-[#2B546E] focus:border-[#D6A64F] text-white text-xs rounded-xl outline-none transition-all placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#287C78] to-[#1F6360] hover:from-[#1F6360] hover:to-[#174F4D] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 border border-teal-400/20 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating Officer...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#D6A64F]" />
                    <span>Access Command Center</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Disclaimer */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-[11px] text-slate-400">
            <p className="flex items-center justify-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#287C78]" />
              Secured with bcrypt-256 &amp; JWT RBAC verification
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0C1A24]/70 px-6 py-3 text-center text-xs text-slate-400">
        CodeCivic Civic Technology System • Nagar Nigam Kota / Pan-India Central Registry
      </footer>
    </div>
  );
}
