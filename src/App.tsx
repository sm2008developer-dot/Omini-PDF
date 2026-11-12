/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { LandingView } from './components/LandingView.js';
import { PdfToolWorkspace } from './components/PdfToolWorkspace.js';
import { AiToolsWorkspace } from './components/AiToolsWorkspace.js';
import { UserDashboard } from './components/UserDashboard.js';
import { AdminPanel } from './components/AdminPanel.js';
import { AuthModal } from './components/AuthModal.js';
import { ProUpgradeModal } from './components/ProUpgradeModal.js';
import { AdSenseBanner } from './components/AdSenseBanner.js';
import { ToolId, TOOLS_CONFIG } from './types.js';
import { api, User, PlatformLimits } from './utils/api.js';
import { DEFAULT_LIMITS } from './utils/pdfLimits.js';
import { subscribeToAuth, logoutFirebase } from './lib/firebaseService.js';
import {
  resolveCurrentRoute,
  navigateTo,
  updateDocumentSeo,
  TOOL_PATH_MAP,
} from './utils/seoRouter.js';

export default function App() {
  const initialRoute = resolveCurrentRoute();
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<PlatformLimits>(DEFAULT_LIMITS);
  const [currentView, setCurrentView] = useState<'home' | 'tool' | 'dashboard' | 'admin'>(initialRoute.view);
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(initialRoute.toolId);

  // Intent queues for seamless user journey after login
  const [pendingToolId, setPendingToolId] = useState<ToolId | null>(null);
  const [pendingUpgradeAfterAuth, setPendingUpgradeAfterAuth] = useState(false);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authRedirectReason, setAuthRedirectReason] = useState<string | undefined>();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [paymentNotification, setPaymentNotification] = useState<{
    type: 'success' | 'pending' | 'failed' | 'error';
    message: string;
  } | null>(null);

  // Sync route on popstate and initial scroll
  useEffect(() => {
    const route = resolveCurrentRoute();
    updateDocumentSeo(route.path);

    if (route.scrollToSection) {
      setTimeout(() => {
        document.getElementById(route.scrollToSection!)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }

    const handlePopState = () => {
      const activeRoute = resolveCurrentRoute();
      setCurrentView(activeRoute.view);
      setSelectedToolId(activeRoute.toolId);
      updateDocumentSeo(activeRoute.path);
      if (activeRoute.scrollToSection) {
        setTimeout(() => {
          document.getElementById(activeRoute.scrollToSection!)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Dynamically update document title & meta whenever view or tool changes
  useEffect(() => {
    if (currentView === 'tool' && selectedToolId) {
      const toolRoute = TOOL_PATH_MAP[selectedToolId] || '/';
      updateDocumentSeo(toolRoute);
    } else if (currentView === 'dashboard') {
      updateDocumentSeo('/dashboard');
    } else if (currentView === 'admin') {
      updateDocumentSeo('/admin');
    } else if (currentView === 'home') {
      const path = window.location.pathname;
      if (path === '/pricing' || path === '/faqs') {
        updateDocumentSeo(path);
      } else {
        updateDocumentSeo('/');
      }
    }
  }, [currentView, selectedToolId]);

  // Check initial login session, public platform settings, and payment landing params
  useEffect(() => {
    const initSession = async () => {
      // Check if redirected back from ZapPay checkout
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const orderId = urlParams.get('orderId');
      const reason = urlParams.get('reason') || urlParams.get('message');

      if (paymentStatus === 'success') {
        setPaymentNotification({
          type: 'success',
          message: `🎉 Payment verified via ZapPay (${orderId ? `Order: ${orderId}` : ''})! 30 Days of Unlimited Pro Access is now active.`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'pending') {
        setPaymentNotification({
          type: 'pending',
          message: `⏳ Your UPI payment is still processing with your bank (${orderId ? `Order: ${orderId}` : ''}). Pro access will activate as soon as bank confirmation arrives.`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'failed' || paymentStatus === 'error') {
        setPaymentNotification({
          type: 'failed',
          message: `Payment notice: ${reason || 'Payment could not be completed.'}`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      }

      try {
        const publicLimits = await api.getPublicSettings();
        if (publicLimits) {
          setLimits((prev) => ({ ...prev, ...publicLimits }));
        }
      } catch (err) {
        console.warn('Could not load public settings:', err);
      }

      const token = api.getToken();
      if (!token) return;

      try {
        const res = await api.getMe();
        setUser(res.user);
        if (res.limits) setLimits(res.limits);
      } catch (err) {
        console.warn('Backend sync notice:', err);
      }
    };

    initSession();

    // Subscribe to Firebase Auth state for real-time user sync
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        api.setUserEmail(fbUser.email);
        try {
          const syncRes = await api.syncFirebaseSession(fbUser);
          if (syncRes?.user) {
            setUser(syncRes.user);
          }
        } catch (e) {
          console.warn('Silent session sync notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', reason?: string) => {
    setAuthInitialMode(mode);
    setAuthRedirectReason(reason);
    setAuthModalOpen(true);
  };

  const handleOpenUpgrade = (reason?: string) => {
    // If user already has an active Pro plan, do not allow re-subscribing
    if (user?.plan === 'pro') {
      return;
    }
    if (!user) {
      setPendingUpgradeAfterAuth(true);
      handleOpenAuth(
        'login',
        'Please sign in with Google first so your 30-day Pro subscription is securely linked to your account.'
      );
      return;
    }
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    setSelectedToolId(null);
    navigateTo('/');
  };

  const handleNavigateDashboard = () => {
    if (!user) {
      handleOpenAuth('login', 'Please sign in to view your dashboard & history.');
    } else {
      setCurrentView('dashboard');
      setSelectedToolId(null);
      navigateTo('/dashboard');
    }
  };

  const handleNavigateAdmin = () => {
    if (!user || user.role !== 'admin') {
      handleOpenAuth('login', 'Please sign in with administrator credentials.');
    } else {
      setCurrentView('admin');
      setSelectedToolId(null);
      navigateTo('/admin');
    }
  };

  const handleSelectTool = (toolId: ToolId) => {
    const targetPath = TOOL_PATH_MAP[toolId] || '/';
    if (!user) {
      const toolName = TOOLS_CONFIG.find((t) => t.id === toolId)?.name || 'this tool';
      setPendingToolId(toolId);
      handleOpenAuth(
        'login',
        `Please sign in or create a free account to use ${toolName}. Your free usage and document history will be saved.`
      );
      return;
    }
    setSelectedToolId(toolId);
    setCurrentView('tool');
    navigateTo(targetPath);
  };

  const handleLogout = async () => {
    await logoutFirebase().catch(() => {});
    api.logout();
    setUser(null);
    setCurrentView('home');
    setSelectedToolId(null);
    setPendingToolId(null);
    setPendingUpgradeAfterAuth(false);
    navigateTo('/');
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setAuthModalOpen(false);

    // If user intended to upgrade to Pro, open upgrade modal right away
    if (pendingUpgradeAfterAuth) {
      setPendingUpgradeAfterAuth(false);
      setTimeout(() => {
        setUpgradeModalOpen(true);
      }, 200);
      return;
    }

    // If user intended to use a tool, navigate directly to that tool
    if (pendingToolId) {
      const targetTool = pendingToolId;
      setPendingToolId(null);
      setSelectedToolId(targetTool);
      setCurrentView('tool');
      navigateTo(TOOL_PATH_MAP[targetTool] || '/');
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const selectedToolConfig = TOOLS_CONFIG.find((t) => t.id === selectedToolId);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 antialiased selection:bg-rose-500 selection:text-white">
      {/* Global Live Announcement Banner */}
      {limits.announcementActive && limits.announcementText && !announcementDismissed && (
        <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 shadow-sm relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-center text-center">
              <span className="truncate max-w-[200px] xs:max-w-[280px] sm:max-w-none">{limits.announcementText}</span>
              {(!user || user.plan === 'free') && (
                <button
                  onClick={() => handleOpenUpgrade('Announcement special offer')}
                  className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:text-amber-200 transition-colors shrink-0 whitespace-nowrap cursor-pointer text-[11px] sm:text-xs bg-white/10 px-2 py-0.5 rounded-full"
                >
                  Claim ₹99 Offer &rarr;
                </button>
              )}
            </div>
            <button
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

      {/* Payment Gateway Status Notification Banner */}
      {paymentNotification && (
        <div
          className={`py-3 px-4 text-xs md:text-sm font-semibold shadow-sm relative z-50 flex items-center justify-between gap-3 ${
            paymentNotification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : paymentNotification.type === 'pending'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-1 justify-center text-center">
            <span>{paymentNotification.message}</span>
          </div>
          <button
            onClick={() => setPaymentNotification(null)}
            aria-label="Dismiss payment notice"
            className="p-1 hover:bg-black/10 rounded-md transition-colors text-current cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sticky Navigation */}
      <Navbar
        user={user}
        limits={limits}
        onOpenAuth={handleOpenAuth}
        onOpenUpgrade={() => handleOpenUpgrade()}
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
            onOpenUpgrade={() => handleOpenUpgrade()}
          />
        )}

        {currentView === 'tool' && selectedToolConfig && (
          <>
            {selectedToolConfig.category === 'pdf' ? (
              <PdfToolWorkspace
                toolId={selectedToolConfig.id}
                user={user}
                limits={limits}
                onBack={handleNavigateHome}
                onRequireAuth={(reason) => handleOpenAuth('login', reason)}
                onRequireUpgrade={(reason) => handleOpenUpgrade(reason)}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <AiToolsWorkspace
                toolId={selectedToolConfig.id}
                user={user}
                limits={limits}
                onBack={handleNavigateHome}
                onRequireAuth={(reason) => handleOpenAuth('login', reason)}
                onRequireUpgrade={(reason) => handleOpenUpgrade(reason)}
                onUserUpdate={handleUserUpdate}
              />
            )}
          </>
        )}

        {currentView === 'dashboard' && user && (
          <UserDashboard
            user={user}
            limits={limits}
            onOpenUpgrade={() => handleOpenUpgrade()}
            onSelectTool={handleSelectTool}
            onUserUpdate={handleUserUpdate}
          />
        )}

        {currentView === 'dashboard' && !user && (
          <div className="max-w-xl mx-auto my-12 px-4 text-center">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Sign in to View Your Dashboard</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                Access your document processing history, remaining PDF &amp; AI quota, and 30-Day Pro subscription status.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => handleOpenAuth('login', 'Sign in to access your dashboard')}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenAuth('register', 'Create an account to track your documents')}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Google AdSense In-feed Native Ad (Slot: 1446830999) */}
            <AdSenseBanner
              slotId="1446830999"
              layout="in-feed"
              layoutKey="-f9+4w+7x-eg+3a"
              user={user}
              onOpenUpgrade={() => handleOpenUpgrade('Upgrade to Pro to remove all ads and unlock unlimited tools')}
            />
          </div>
        )}

        {currentView === 'admin' && user && user.role === 'admin' && (
          <AdminPanel
            currentUser={user}
            onBackToHome={handleNavigateHome}
            onSettingsUpdate={(newLimits) => setLimits((prev) => ({ ...prev, ...newLimits }))}
          />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authInitialMode}
        redirectReason={authRedirectReason}
      />

      {/* Pro Upgrade & Payment Modal */}
      <ProUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        user={user}
        onSuccess={handleUserUpdate}
        reason={upgradeReason}
        defaultPrice={limits.proPriceINR}
        durationDays={limits.subscriptionDays}
      />
    </div>
  );
}
