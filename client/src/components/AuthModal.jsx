import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  KeyRound,
  Copy,
  Check,
  User,
  Shield,
  Info,
  Loader2,
} from 'lucide-react';
import { getAllStates, getDistrictsForState } from '../utils/indiaGeoData';

export default function AuthModal({ isOpen, onClose, initialView = 'login', onSuccess }) {
  const { login, register, setAuthSession } = useAuth();
  const [view, setView] = useState(initialView); // 'login', 'register', 'forgot', 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(null);

  // Demo accounts — fetched from server so credentials are NOT compiled into the client bundle.
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [demoLoading, setDemoLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration form state (defaulted to Kota, Rajasthan)
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    state: 'Rajasthan',
    district: 'Kota',
  });

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Fetch demo credentials from server when modal opens on login view
  useEffect(() => {
    if (!isOpen || view !== 'login') return;
    if (demoAccounts.length > 0) return; // already loaded
    setDemoLoading(true);
    fetch('/api/auth/demo-credentials')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.accounts)) {
          // Attach UI-only display metadata (no security impact)
          const decorated = data.accounts.map((a) => ({
            ...a,
            badgeColor: a.role === 'ADMIN'
              ? 'bg-[#D6A64F]/20 text-[#D6A64F] border-[#D6A64F]/40'
              : 'bg-[#287C78]/15 text-[#287C78] border-[#287C78]/30',
            icon: a.role === 'ADMIN' ? Shield : User,
          }));
          setDemoAccounts(decorated);
        }
      })
      .catch(() => {
        // Demo credentials unavailable — silently hide the demo section
        setDemoAccounts([]);
      })
      .finally(() => setDemoLoading(false));
  }, [isOpen, view, demoAccounts.length]);

  if (!isOpen) return null;

  const handleSelectDemo = async (account) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Demo login failed.');
      }
      setAuthSession(data.token, data.user);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Could not authenticate demo citizen.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = (account, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(account.email);
    setCopiedAccount(account.id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (regData.password !== regData.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (regData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(regData);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message);
      } else {
        setError(data.message || 'Unable to process password recovery.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Password reset successfully! Please log in.');
        setView('login');
      } else {
        setError(data.message || 'Reset failed.');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/65 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#DCE5E9] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#193B50] px-6 py-4 text-white flex items-center justify-between border-b border-[#254A63]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#D6A64F]" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                {view === 'login' && 'Citizen & Authority Sign In'}
                {view === 'register' && 'New Citizen Registration'}
                {view === 'forgot' && 'Reset Password'}
                {view === 'reset' && 'Create New Password'}
              </h3>
              <p className="text-[11px] text-[#DCE5E9]/80 leading-none">CodeCivic Governance Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-[#C65B5B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-[#328568]">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* DEMO ACCESS SECTION (REQUIREMENT 7) — credentials fetched from server, not compiled into bundle */}
          {view === 'login' && (
            <div className="mb-5 p-3.5 bg-[#F4F7F8] border border-[#DCE5E9] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#193B50] uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#D6A64F]" />
                  Demo Access (Evaluation Accounts)
                </span>
                <span className="text-[10px] text-[#64748B] font-medium">Click to populate</span>
              </div>

              {demoLoading && (
                <div className="flex items-center gap-2 py-2 text-[11px] text-[#64748B]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading demo accounts…
                </div>
              )}

              {!demoLoading && demoAccounts.length === 0 && (
                <p className="text-[10px] text-[#64748B] italic py-1">
                  Demo accounts unavailable in this deployment.
                </p>
              )}

              {!demoLoading && demoAccounts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {demoAccounts.map((account) => {
                    const Icon = account.icon;
                    const isSelected = loginEmail === account.email;
                    return (
                      <div
                        key={account.id}
                        onClick={() => handleSelectDemo(account)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-[#193B50] ring-1 ring-[#193B50] shadow-xs'
                            : 'bg-white border-[#DCE5E9] hover:border-[#287C78]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[11px] text-[#193B50] truncate">{account.type}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCredentials(account, e)}
                            title="Copy Email"
                            className="p-1 hover:bg-[#F4F7F8] rounded text-[#64748B] hover:text-[#193B50]"
                          >
                            {copiedAccount === account.id ? (
                              <Check className="w-3 h-3 text-[#328568]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-[#64748B] truncate font-mono">{account.email}</p>
                        <p className="text-[10px] text-[#287C78] font-semibold mt-0.5">Click to sign in instantly</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-[10px] text-[#64748B] italic">
                * Citizen demonstration accounts for evaluation. One-click passwordless sign in.
              </div>
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] focus:ring-1 focus:ring-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#193B50]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setView('forgot');
                    }}
                    className="text-[11px] text-[#287C78] hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] focus:ring-1 focus:ring-[#193B50] bg-white text-[#253746] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#64748B] hover:text-[#193B50]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-[#64748B]">New resident? </span>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('register');
                  }}
                  className="text-xs text-[#287C78] font-bold hover:underline"
                >
                  Register as Citizen
                </button>
              </div>
            </form>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="name@email.com"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Mobile (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regData.mobile}
                    onChange={(e) => setRegData({ ...regData, mobile: e.target.value.replace(/\D/g, '') })}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">State / UT *</label>
                  <select
                    value={regData.state}
                    onChange={(e) => {
                      const newState = e.target.value;
                      const dists = getDistrictsForState(newState);
                      setRegData({
                        ...regData,
                        state: newState,
                        district: dists.length > 0 ? dists[0] : '',
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  >
                    {getAllStates().map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">District / City *</label>
                  {getDistrictsForState(regData.state).length > 0 ? (
                    <select
                      value={regData.district}
                      onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    >
                      {getDistrictsForState(regData.state).map((dst) => (
                        <option key={dst} value={dst}>{dst}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={regData.district}
                      onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                      placeholder="e.g. District / City"
                      className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Password (min 8 chars) *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#193B50]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#193B50]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-[#64748B] leading-tight">
                Public citizen accounts receive the CITIZEN role. All data is encrypted and handled under civic portal guidelines.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#287C78] text-white rounded-lg text-xs font-bold hover:bg-[#1F6360] transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Creating Citizen Profile...' : 'Complete Citizen Registration'}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-[#64748B]">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="text-xs text-[#193B50] font-bold hover:underline"
                >
                  Log in
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-[#64748B] leading-relaxed">
                Enter your registered citizen email. The system will prepare a secure password reset token.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#193B50] text-white rounded-lg text-xs font-bold hover:bg-[#122B3B] transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Generate Reset Token'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="text-xs text-[#287C78] font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD VIEW */}
          {view === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste token"
                  className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] font-mono bg-white text-[#253746]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#287C78] text-white rounded-lg text-xs font-bold hover:bg-[#1F6360] transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
