import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

import HomePage from './pages/HomePage';
import ReportIssuePage from './pages/ReportIssuePage';
import ExploreIssuesPage from './pages/ExploreIssuesPage';
import TrackComplaintPage from './pages/TrackComplaintPage';
import MyComplaintsPage from './pages/MyComplaintsPage';
import HelpSupportPage from './pages/HelpSupportPage';
import TransparencyPage from './pages/TransparencyPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminPortalLayout from './pages/admin/AdminPortalLayout';

// Canonical route mapping for Citizen and Admin portals
const ROUTE_PATH_MAP = {
  'home': '/',
  'report': '/report',
  'explore': '/explore',
  'track': '/track',
  'my-complaints': '/my-complaints',
  'dashboard': '/my-complaints',
  'transparency': '/transparency',
  'help': '/help',
  'admin': '/admin/dashboard',
};

function normalizePathToRoute(path) {
  const cleanPath = (path || '/').toLowerCase().replace(/\/$/, '') || '/';
  if (cleanPath.startsWith('/admin')) {
    return cleanPath;
  }
  if (cleanPath === '/' || cleanPath === '') return 'home';
  if (cleanPath === '/report') return 'report';
  if (cleanPath === '/explore') return 'explore';
  if (cleanPath === '/track') return 'track';
  if (cleanPath === '/my-complaints' || cleanPath === '/dashboard') return 'my-complaints';
  if (cleanPath === '/transparency') return 'transparency';
  if (cleanPath === '/help') return 'help';
  if (cleanPath === '/login') return 'login';
  if (cleanPath === '/register') return 'register';
  return 'home';
}

function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [trackInitialCode, setTrackInitialCode] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      const cleanPath = path.toLowerCase().replace(/\/$/, '') || '/';
      if (cleanPath === '/login') {
        setAuthModalView('login');
        setAuthModalOpen(true);
      } else if (cleanPath === '/register') {
        setAuthModalView('register');
        setAuthModalOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle URL navigation with history push
  const handleNavigate = useCallback((target, param = '') => {
    let newPath = target;
    if (ROUTE_PATH_MAP[target]) {
      newPath = ROUTE_PATH_MAP[target];
    } else if (target === 'login') {
      setAuthModalView('login');
      setAuthModalOpen(true);
      return;
    } else if (target === 'register') {
      setAuthModalView('register');
      setAuthModalOpen(true);
      return;
    }

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    setCurrentPath(newPath);

    if ((target === 'track' || newPath === '/track') && param) {
      setTrackInitialCode(param);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAuth = (view = 'login') => {
    setAuthModalView(view);
    setAuthModalOpen(true);
  };

  // Check if current view is an Admin Portal route
  const isAdminRoute = currentPath.startsWith('/admin');

  // Render dedicated Admin Portal (Independent of citizen layout)
  if (isAdminRoute) {
    if (currentPath === '/admin/login') {
      return <AdminLoginPage onNavigate={handleNavigate} />;
    }
    return (
      <AdminPortalLayout
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />
    );
  }

  // Render Citizen Portal
  const citizenRoute = normalizePathToRoute(currentPath);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F8] text-[#253746]">
      {/* Top Citizen Navigation */}
      <Navbar
        currentRoute={citizenRoute}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Citizen Content Area */}
      <main className="flex-1">
        {citizenRoute === 'home' && <HomePage onNavigate={handleNavigate} />}
        {citizenRoute === 'report' && (
          <ReportIssuePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}
        {citizenRoute === 'explore' && (
          <ExploreIssuesPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}
        {citizenRoute === 'track' && (
          <TrackComplaintPage
            initialCode={trackInitialCode}
            onOpenAuth={handleOpenAuth}
          />
        )}
        {citizenRoute === 'my-complaints' && (
          <MyComplaintsPage onNavigate={handleNavigate} />
        )}
        {citizenRoute === 'transparency' && (
          <TransparencyPage onNavigate={handleNavigate} />
        )}
        {citizenRoute === 'help' && (
          <HelpSupportPage onNavigate={handleNavigate} />
        )}
      </main>

      {/* Citizen Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Universal Citizen/Admin Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialView={authModalView}
        onSuccess={() => {
          setAuthModalOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
