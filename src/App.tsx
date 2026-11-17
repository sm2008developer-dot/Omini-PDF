/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { LandingView } from './components/LandingView.js';
import { ToolId, TOOLS_CONFIG } from './types.js';
import { api, User, PlatformLimits } from './utils/api.js';
import { DEFAULT_LIMITS } from './utils/pdfLimits.js';
import { useSEO } from './hooks/useSEO.js';
import { trackPageChangeForVignette } from './utils/monetag.js';
import {
  resolveCurrentRoute,
  navigateTo,
  TOOL_PATH_MAP,
} from './utils/seoRouter.js';

// Code-split heavy workspaces & modals for ultra-fast initial load
const PdfToolWorkspace = lazy(() =>
  import('./components/PdfToolWorkspace.js').then((m) => ({ default: m.PdfToolWorkspace }))
);
const UserDashboard = lazy(() =>
  import('./components/UserDashboard.js').then((m) => ({ default: m.UserDashboard }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel.js').then((m) => ({ default: m.AdminPanel }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal.js').then((m) => ({ default: m.AuthModal }))
);

const WorkspaceFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#77717B]">
    <Loader2 className="w-8 h-8 text-[#E83E8C] animate-spin" />
    <p className="text-xs font-serif font-semibold italic">Loading PDF workspace...</p>
  </div>
);

export default function App() {
  const initialRoute = resolveCurrentRoute();
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<PlatformLimits>(DEFAULT_LIMITS);
  const [currentView, setCurrentView] = useState<'home' | 'tool' | 'dashboard' | 'admin'>(initialRoute.view);
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(initialRoute.toolId);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authRedirectReason, setAuthRedirectReason] = useState<string | undefined>();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const [activePath, setActivePath] = useState<string>(initialRoute.path);
  const previousPathRef = React.useRef<string>(initialRoute.path);

  // Dynamically manage document.title, meta description, keywords, and social tags across routes & tools
  useSEO({
    view: currentView,
    toolId: selectedToolId,
    path: activePath,
  });

  // Trigger Monetag Vignette Banner only after 3-4 SPA page navigations (keeps initial load ultra-fast)
  useEffect(() => {
    const prev = previousPathRef.current;
    if (prev !== activePath) {
      trackPageChangeForVignette(prev, activePath);
      previousPathRef.current = activePath;
    }
  }, [activePath]);

  // Sync route on popstate and initial scroll
  useEffect(() => {
    const route = resolveCurrentRoute();
    setActivePath(route.path);

    if (route.scrollToSection) {
      setTimeout(() => {
        document.getElementById(route.scrollToSection!)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }

    const handlePopState = () => {
      const activeRoute = resolveCurrentRoute();
      setCurrentView(activeRoute.view);
      setSelectedToolId(activeRoute.toolId);
      setActivePath(activeRoute.path);
      if (activeRoute.scrollToSection) {
        setTimeout(() => {
          document.getElementById(activeRoute.scrollToSection!)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentView === 'tool' && selectedToolId) {
      setActivePath(TOOL_PATH_MAP[selectedToolId] || '/');
    } else if (currentView === 'dashboard') {
      setActivePath(user ? '/dashboard' : '/history');
    } else if (currentView === 'admin') {
      setActivePath('/admin');
    } else if (currentView === 'home') {
      setActivePath(window.location.pathname === '/faqs' ? '/faqs' : '/');
    }
  }, [currentView, selectedToolId, user]);

  // Non-blocking session & Firebase Auth bootstrap (deferred on guest visits for instant FCP)
  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirebase: (() => void) | null = null;
    let idleHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    const initSession = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (!isMounted) return;
          setUser(res.user);
          if (res.limits) setLimits(res.limits);
        } catch (err) {
          console.warn('Backend sync notice:', err);
        }
      }

      api.getPublicSettings()
        .then((publicLimits) => {
          if (isMounted && publicLimits) {
            setLimits((prev) => ({ ...prev, ...publicLimits }));
          }
        })
        .catch(() => {});
    };

    const startFirebaseListener = async () => {
      try {
        const { subscribeToAuth } = await import('./lib/firebaseService.js');
        if (!isMounted) return;
        unsubscribeFirebase = subscribeToAuth(async (fbUser) => {
          if (fbUser && isMounted) {
            setUser(fbUser);
            api.setUserEmail(fbUser.email);
            try {
              const syncRes = await api.syncFirebaseSession(fbUser);
              if (syncRes?.user && isMounted) {
                setUser(syncRes.user);
              }
            } catch (e) {
              console.warn('Silent session sync notice:', e);
            }
          }
        });
      } catch (err) {
        console.warn('Auth listener notice:', err);
      }
    };

    initSession();

    // Load Firebase Auth immediately only if user has previously signed in; otherwise defer to idle
    if (api.getToken() || api.getUserEmail()) {
      startFirebaseListener();
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        () => startFirebaseListener(),
        { timeout: 2000 }
      );
    } else {
      timerHandle = setTimeout(() => startFirebaseListener(), 1200);
    }

    return () => {
      isMounted = false;
      if (unsubscribeFirebase) unsubscribeFirebase();
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) clearTimeout(timerHandle);
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', reason?: string) => {
    setAuthInitialMode(mode);
    setAuthRedirectReason(reason);
    setAuthModalOpen(true);
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    setSelectedToolId(null);
    setActivePath('/');
    navigateTo('/');
  };

  const handleNavigateDashboard = () => {
    const nextPath = user ? '/dashboard' : '/history';
    setCurrentView('dashboard');
    setSelectedToolId(null);
    setActivePath(nextPath);
    navigateTo(nextPath);
  };

  const handleNavigateAdmin = () => {
    if (!user || user.role !== 'admin') {
      handleOpenAuth('login', 'Please sign in with administrator credentials.');
    } else {
      setCurrentView('admin');
      setSelectedToolId(null);
      setActivePath('/admin');
      navigateTo('/admin');
    }
  };

  // All 11 PDF tools open immediately & free without forced login
  const handleSelectTool = (toolId: ToolId) => {
    const targetPath = TOOL_PATH_MAP[toolId] || '/';
    setSelectedToolId(toolId);
    setCurrentView('tool');
    setActivePath(targetPath);
    navigateTo(targetPath);
  };

  const handleLogout = async () => {
    try {
      const { logoutFirebase } = await import('./lib/firebaseService.js');
      await logoutFirebase();
    } catch {
      // ignore if firebase wasn't loaded yet
    }
    api.logout();
    setUser(null);
    setCurrentView('home');
    setSelectedToolId(null);
    setActivePath('/');
    navigateTo('/');
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setAuthModalOpen(false);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const selectedToolConfig = TOOLS_CONFIG.find((t) => t.id === selectedToolId);

  return (
    <div className="min-h-screen bg-[#FFF4F8] flex flex-col font-sans text-[#24212A] antialiased selection:bg-[#E83E8C] selection:text-white">
      {/* Optional Announcement Banner (only if admin sets a non-promo announcement) */}
      {limits.announcementActive &&
        limits.announcementText &&
        !announcementDismissed &&
        !/pro|₹|99|199|offer/i.test(limits.announcementText) && (
          <div className="bg-gradient-to-r from-[#E83E8C] to-[#C92B72] text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 shadow-sm relative z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-center text-center">
                <span className="truncate">{limits.announcementText}</span>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementDismissed(true)}
                aria-label="Dismiss announcement"
                className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white cursor-pointer shrink-0 ml-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

      {/* Sticky Navigation */}
      <Navbar
        user={user}
        limits={limits}
        onOpenAuth={handleOpenAuth}
        onNavigateHome={handleNavigateHome}
        onSelectTool={handleSelectTool}
        onNavigateDashboard={handleNavigateDashboard}
        onNavigateAdmin={handleNavigateAdmin}
        onLogout={handleLogout}
        currentView={currentView}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <LandingView
            user={user}
            limits={limits}
            onSelectTool={handleSelectTool}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentView === 'tool' && selectedToolConfig && (
          <Suspense fallback={<WorkspaceFallback />}>
            <PdfToolWorkspace
              toolId={selectedToolConfig.id}
              user={user}
              limits={limits}
              onBack={handleNavigateHome}
              onOpenHistory={handleNavigateDashboard}
              onRequireAuth={(reason) => handleOpenAuth('login', reason)}
              onRequireUpgrade={() => {}}
              onUserUpdate={handleUserUpdate}
            />
          </Suspense>
        )}

        {currentView === 'dashboard' && (
          <Suspense fallback={<WorkspaceFallback />}>
            <UserDashboard
              user={user}
              limits={limits}
              onSelectTool={handleSelectTool}
              onUserUpdate={handleUserUpdate}
              onOpenAuth={handleOpenAuth}
            />
          </Suspense>
        )}

        {currentView === 'admin' && user && user.role === 'admin' && (
          <Suspense fallback={<WorkspaceFallback />}>
            <AdminPanel
              currentUser={user}
              onBackToHome={handleNavigateHome}
              onSettingsUpdate={(newLimits) => setLimits((prev) => ({ ...prev, ...newLimits }))}
            />
          </Suspense>
        )}
      </main>

      {/* Lazy Authentication Modal */}
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            initialMode={authInitialMode}
            redirectReason={authRedirectReason}
          />
        </Suspense>
      )}
    </div>
  );
}
