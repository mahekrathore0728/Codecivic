import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  User,
  Shield,
  Loader2,
  Building2,
  MapPin,
  Lock,
} from 'lucide-react';
import {
  getAllStates,
  getDistrictsForState,
  LOCAL_BODY_TYPES,
  getLocalBodiesForDistrict,
  getWardsOrVillages,
} from '../utils/indiaGeoData';

export default function AuthModal({ isOpen, onClose, initialView = 'login', initialTab = 'citizen', onSuccess }) {
  const { login, register } = useAuth();

  // Active tab: 'citizen' or 'admin'
  const [activeTab, setActiveTab] = useState(initialTab);
  // View mode within tab: 'login', 'register', 'forgot'
  const [view, setView] = useState(initialView);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Citizen Registration state (with Pan-India cascading location)
  const [regData, setRegData] = useState(() => {
    const defaultState = states && states.length > 0 ? states[0] : '';
    const dists = defaultState ? getDistrictsForState(defaultState) : [];
    const defaultDist = dists[0] || '';
    const bodies = defaultDist ? getLocalBodiesForDistrict(defaultDist, defaultState) : [];
    const defaultBody = bodies[0] || { name: '', type: 'MUNICIPAL_CORPORATION' };
    return {
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      state: defaultState,
      district: defaultDist,
      local_body_type: defaultBody.type,
      local_body: defaultBody.name,
      ward_village: 'Ward 1',
      address: '',
    };
  });

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  if (!isOpen) return null;

  const states = getAllStates();
  const availableDistricts = getDistrictsForState(regData.state);
  const availableLocalBodies = getLocalBodiesForDistrict(regData.district, regData.state);
  const isRural = regData.local_body_type === 'GRAM_PANCHAYAT';
  const availableWards = getWardsOrVillages(regData.local_body, isRural);

  const handleStateChange = (e) => {
    const newState = e.target.value;
    const districts = getDistrictsForState(newState);
    const newDistrict = districts[0] || '';
    const localBodies = getLocalBodiesForDistrict(newDistrict, newState);
    const firstBody = localBodies[0] || { name: '', type: 'MUNICIPALITY' };

    setRegData((prev) => ({
      ...prev,
      state: newState,
      district: newDistrict,
      local_body_type: firstBody.type,
      local_body: firstBody.name,
      ward_village: 'Ward 1',
    }));
  };

  const handleDistrictChange = (e) => {
    const newDist = e.target.value;
    const localBodies = getLocalBodiesForDistrict(newDist, regData.state);
    const firstBody = localBodies[0] || { name: '', type: 'MUNICIPALITY' };

    setRegData((prev) => ({
      ...prev,
      district: newDist,
      local_body_type: firstBody.type,
      local_body: firstBody.name,
      ward_village: 'Ward 1',
    }));
  };

  const handleLocalBodyChange = (e) => {
    const selectedName = e.target.value;
    const matched = availableLocalBodies.find((b) => b.name === selectedName);
    const matchedType = matched ? matched.type : regData.local_body_type;

    setRegData((prev) => ({
      ...prev,
      local_body: selectedName,
      local_body_type: matchedType,
      ward_village: matchedType === 'GRAM_PANCHAYAT' ? 'Central Village (Khas)' : 'Ward 1',
    }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(loginEmail.trim(), loginPassword);

      if (activeTab === 'admin') {
        const ADMIN_ROLES = [
          'ADMIN',
          'NATIONAL_SUPER_ADMIN',
          'STATE_ADMIN',
          'DISTRICT_ADMIN',
          'LOCAL_BODY_ADMIN',
          'DEPARTMENT_ADMIN',
          'FIELD_OFFICER',
        ];
        if (!ADMIN_ROLES.includes(user.role)) {
          throw new Error('Access Denied: This account does not possess administrative privileges.');
        }
      }

      onClose();
      if (onSuccess) onSuccess(user);
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
      const user = await register(regData);
      onClose();
      if (onSuccess) onSuccess(user);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
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
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || 'Password reset instructions have been dispatched.');
      } else {
        setError(data.message || 'Password reset request failed.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193B50]/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#DCE5E9] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-[#193B50] px-6 py-4 text-white flex items-center justify-between border-b border-[#254A63] shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="CodeCivic" className="w-9 h-9" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">CodeCivic Portal</h3>
              <p className="text-[11px] text-[#DCE5E9]/80 leading-none">
                {activeTab === 'citizen' ? 'Pan-India Citizen Engagement Portal' : 'Official Administration Portal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portal Type Switcher */}
        <div className="flex border-b border-[#DCE5E9] bg-[#F4F7F8] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setView('login');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'citizen'
                ? 'border-[#287C78] text-[#193B50] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#193B50]'
            }`}
          >
            <User className="w-4 h-4" />
            Citizen Access
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setView('login');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'admin'
                ? 'border-[#D6A64F] text-[#193B50] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#193B50]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#D6A64F]" />
            Administrative Authority
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1">
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

          {/* CITIZEN / ADMIN LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-bold text-[#193B50]">
                  {activeTab === 'citizen' ? 'Citizen Sign In' : 'Government Officer Sign In'}
                </h4>
                <p className="text-xs text-[#64748B]">
                  {activeTab === 'citizen'
                    ? 'Access your reported issues, vote on community grievances, and track live SLA progress.'
                    : 'Sign in to your municipal authority or departmental dashboard across India.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={activeTab === 'citizen' ? 'citizen@example.com' : 'officer@codecivic.gov.in'}
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
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] focus:ring-1 focus:ring-[#193B50] bg-white text-[#253746]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#193B50]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#193B50] hover:bg-[#254A63] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    {activeTab === 'citizen' ? 'Sign In as Citizen' : 'Sign In to Admin Portal'}
                  </>
                )}
              </button>

              {activeTab === 'citizen' && (
                <div className="text-center pt-2 border-t border-[#DCE5E9]">
                  <p className="text-xs text-[#64748B]">
                    New to CodeCivic?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setView('register');
                      }}
                      className="text-[#287C78] font-bold hover:underline"
                    >
                      Create Citizen Account
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* CITIZEN REGISTRATION (with cascading Pan-India location) */}
          {view === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <h4 className="text-sm font-bold text-[#193B50]">Citizen Registration</h4>
                <p className="text-xs text-[#64748B]">
                  Join citizens across all 28 States and 8 UTs reporting civic issues.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regData.mobile}
                    onChange={(e) => setRegData({ ...regData, mobile: e.target.value.replace(/\D/g, '') })}
                    placeholder="10-digit Indian Mobile"
                    className="w-full px-3.5 py-2 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                  />
                </div>
              </div>

              {/* Cascading Geographic Selectors */}
              <div className="p-3 bg-[#F4F7F8] rounded-xl border border-[#DCE5E9] space-y-2.5">
                <span className="text-[11px] font-bold text-[#193B50] flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#287C78]" />
                  Your Jurisdiction & Location
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#193B50] mb-1">State / UT</label>
                    <select
                      value={regData.state}
                      onChange={handleStateChange}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-md bg-white text-[#253746]"
                    >
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#193B50] mb-1">District</label>
                    <select
                      value={regData.district}
                      onChange={handleDistrictChange}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-md bg-white text-[#253746]"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#193B50] mb-1">Local Body</label>
                    <select
                      value={regData.local_body}
                      onChange={handleLocalBodyChange}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-md bg-white text-[#253746]"
                    >
                      {availableLocalBodies.map((b) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#193B50] mb-1">Ward / Village</label>
                    <select
                      value={regData.ward_village}
                      onChange={(e) => setRegData({ ...regData, ward_village: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-md bg-white text-[#253746]"
                    >
                      {availableWards.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#193B50] mb-1">Street Address / Locality</label>
                  <input
                    type="text"
                    value={regData.address}
                    onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                    placeholder="House/Plot no., Street or Landmark"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#DCE5E9] rounded-md bg-white text-[#253746]"
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2 pr-9 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-[#64748B]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#193B50] mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={regData.confirmPassword}
                      onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 pr-9 text-xs border border-[#DCE5E9] rounded-lg focus:outline-none focus:border-[#193B50] bg-white text-[#253746]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2 text-[#64748B]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#287C78] hover:bg-[#1f625f] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Citizen Account…
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>

              <div className="text-center pt-2 border-t border-[#DCE5E9]">
                <p className="text-xs text-[#64748B]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setView('login');
                    }}
                    className="text-[#287C78] font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#193B50]">Reset Your Password</h4>
                <p className="text-xs text-[#64748B]">
                  Enter your registered email address to receive password reset instructions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193B50] mb-1">
                  Registered Email Address
                </label>
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
                className="w-full py-2.5 bg-[#193B50] hover:bg-[#254A63] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="text-xs text-[#287C78] font-bold hover:underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
