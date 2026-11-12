import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Bell,
  Menu,
  X,
  User,
  LogOut,
  MapPin,
  FileText,
  Search,
  HelpCircle,
  PlusCircle,
  Lock,
  ChevronDown,
  CheckCircle,
  Sparkles,
  Globe,
  BarChart2,
} from 'lucide-react';

export default function Navbar({ currentRoute, onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'report', label: t('nav.reportIssue'), highlight: true },
    { id: 'explore', label: t('nav.exploreIssues') },
    { id: 'track', label: t('nav.trackComplaint') },
    { id: 'transparency', label: t('nav.transparency') },
    ...(isAuthenticated && !isAdmin ? [{ id: 'my-complaints', label: t('nav.myComplaints') }] : []),
    ...(isAdmin ? [{ id: 'admin', label: t('nav.adminDashboard'), adminBadge: true }] : []),
    { id: 'help', label: t('nav.helpSupport') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#193B50] text-white shadow-sm border-b border-[#254A63]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Portal Branding */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => onNavigate('home')}
          >
            <img src="/logo-icon.svg" alt="CodeCivic" className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-sans">CodeCivic</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#287C78]/40 text-[#90D2CF] border border-[#287C78]/60">
                  Pan-India
                </span>
              </div>
              <p className="text-[11px] text-[#DCE5E9]/80 leading-none">Civic Governance Platform</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              
              if (item.highlight) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-xs ${
                      isActive
                        ? 'bg-[#287C78] text-white ring-2 ring-white/20'
                        : 'bg-[#287C78] text-white hover:bg-[#1F6360]'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              }

              if (item.adminBadge) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border transition-all ${
                      isActive
                        ? 'bg-[#D6A64F] text-[#193B50] border-[#D6A64F] shadow-sm'
                        : 'bg-[#D6A64F]/20 text-[#D6A64F] border-[#D6A64F]/40 hover:bg-[#D6A64F] hover:text-[#193B50]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-[#DCE5E9] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons (Notifications + User/Login) */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white transition-all font-semibold"
              title="Toggle Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-[#D6A64F]" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            {isAuthenticated ? (
              <>
                {/* Notification Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 rounded-lg text-[#DCE5E9] hover:text-white hover:bg-white/10 relative transition-colors focus:outline-none"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#C65B5B] rounded-full shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#DCE5E9] text-[#253746] z-50 overflow-hidden">
                      <div className="p-3.5 bg-[#F4F7F8] border-b border-[#DCE5E9] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
                          Civic Notifications ({unreadCount} unread)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] text-[#287C78] hover:underline font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-[#DCE5E9]/50">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#64748B]">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.slice(0, 15).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.complaint_code) {
                                  onNavigate('track', n.complaint_code);
                                  setNotifDropdownOpen(false);
                                }
                              }}
                              className={`p-3 text-left hover:bg-[#F4F7F8] cursor-pointer transition-colors ${
                                !n.is_read ? 'bg-[#287C78]/5 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-semibold text-[#193B50]">{n.title}</h4>
                                <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                                  {new Date(n.created_at).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Pill & Dropdown */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white transition-all shadow-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#287C78] flex items-center justify-center font-bold text-[11px] text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[110px] truncate font-medium">{user.name.split(' ')[0]}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                      user.role === 'ADMIN' ? 'bg-[#D6A64F] text-[#193B50]' : 'bg-white/20 text-white'
                    }`}>
                      {user.role}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#DCE5E9]" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-[#DCE5E9] text-[#253746] z-50 overflow-hidden py-1">
                      <div className="px-4 py-3 border-b border-[#DCE5E9] bg-[#F4F7F8]">
                        <p className="text-xs font-bold text-[#193B50] truncate">{user.name}</p>
                        <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">📍 {user.district}, {user.state}</p>
                      </div>

                      {user.role === 'ADMIN' ? (
                        <button
                          onClick={() => {
                            onNavigate('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-[#193B50] font-semibold hover:bg-[#F4F7F8] flex items-center gap-2.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#D6A64F]" />
                          Administrative Console
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onNavigate('my-complaints');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-[#253746] font-medium hover:bg-[#F4F7F8] flex items-center gap-2.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#287C78]" />
                          My Complaints
                        </button>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                          onNavigate('home');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#C65B5B] font-medium hover:bg-red-50 flex items-center gap-2.5 border-t border-[#DCE5E9]"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#C65B5B]" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-white text-[#193B50] hover:bg-[#F4F7F8] transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-[#287C78]" />
                Login / Register
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 text-xs rounded bg-white/10 text-white font-bold border border-white/20"
            >
              {language === 'en' ? 'हिं' : 'EN'}
            </button>
            {isAuthenticated && unreadCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-[#C65B5B] rounded-full">
                {unreadCount}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#DCE5E9] hover:text-white hover:bg-white/10 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#122B3B] border-t border-[#254A63] px-4 pt-3 pb-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-sm font-medium rounded-lg flex items-center justify-between ${
                currentRoute === item.id ? 'bg-[#287C78] text-white font-bold' : 'text-[#DCE5E9] hover:bg-white/10'
              }`}
            >
              <span>{item.label}</span>
              {item.adminBadge && (
                <span className="text-[10px] bg-[#D6A64F] text-[#193B50] font-bold px-1.5 py-0.5 rounded">ADMIN</span>
              )}
            </button>
          ))}

          <div className="pt-4 border-t border-[#254A63]">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="text-xs text-[#DCE5E9] px-3.5">
                  Signed in as <span className="font-semibold text-white">{user.name}</span> ({user.role})
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    onNavigate('home');
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-[#C65B5B] hover:bg-white/10 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center text-sm font-bold rounded-lg bg-[#287C78] text-white hover:bg-[#1F6360]"
              >
                Citizen Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
