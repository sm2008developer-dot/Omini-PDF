/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { LandingView } from './components/LandingView.js';
import { PdfToolWorkspace } from './components/PdfToolWorkspace.js';
import { AiToolsWorkspace } from './components/AiToolsWorkspace.js';
import { UserDashboard } from './components/UserDashboard.js';
import { AdminPanel } from './components/AdminPanel.js';
import { AuthModal } from './components/AuthModal.js';
import { ProUpgradeModal } from './components/ProUpgradeModal.js';
import { ToolId, TOOLS_CONFIG } from './types.js';
import { api, User, PlatformLimits } from './utils/api.js';
import { DEFAULT_LIMITS } from './utils/pdfLimits.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<PlatformLimits>(DEFAULT_LIMITS);
  const [currentView, setCurrentView] = useState<'home' | 'tool' | 'dashboard' | 'admin'>('home');
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(null);

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

  // Check initial login session and public platform settings
  useEffect(() => {
    const initSession = async () => {
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
        console.warn('Session expired or invalid, logging out:', err);
        api.logout();
        setUser(null);
      }
    };

    initSession();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', reason?: string) => {
    setAuthInitialMode(mode);
    setAuthRedirectReason(reason);
    setAuthModalOpen(true);
  };

  const handleOpenUpgrade = (reason?: string) => {
    if (!user) {
      setPendingUpgradeAfterAuth(true);
      handleOpenAuth(
        'login',
        'Please sign in or create an account first so your 30-day Pro subscription is securely linked to your account.'
      );
      return;
    }
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  };

  const handleSelectTool = (toolId: ToolId) => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView('home');
    setSelectedToolId(null);
    setPendingToolId(null);
    setPendingUpgradeAfterAuth(false);
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white text-xs md:text-sm font-medium py-2 px-4 shadow-sm relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 justify-center text-center">
              <span>{limits.announcementText}</span>
              {(!user || user.plan === 'free') && (
                <button
                  onClick={() => handleOpenUpgrade('Announcement special offer')}
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-200 transition-colors ml-1 cursor-pointer"
                >
                  Claim ₹99 Offer &rarr;
                </button>
              )}
            </div>
            <button
              onClick={() => setAnnouncementDismissed(true)}
              aria-label="Dismiss announcement"
              className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white cursor-pointer shrink-0"
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
        onOpenUpgrade={() => handleOpenUpgrade()}
        onNavigateHome={() => {
          setCurrentView('home');
          setSelectedToolId(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectTool={handleSelectTool}
        onNavigateDashboard={() => {
          if (!user) {
            handleOpenAuth('login', 'Please sign in to view your dashboard & history.');
          } else {
            setCurrentView('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onNavigateAdmin={() => {
          if (!user || user.role !== 'admin') {
            handleOpenAuth('login', 'Please sign in with administrator credentials.');
          } else {
            setCurrentView('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
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
                onBack={() => {
                  setCurrentView('home');
                  setSelectedToolId(null);
                }}
                onRequireAuth={(reason) => handleOpenAuth('login', reason)}
                onRequireUpgrade={(reason) => handleOpenUpgrade(reason)}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <AiToolsWorkspace
                toolId={selectedToolConfig.id}
                user={user}
                limits={limits}
                onBack={() => {
                  setCurrentView('home');
                  setSelectedToolId(null);
                }}
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

        {currentView === 'admin' && user && user.role === 'admin' && (
          <AdminPanel
            currentUser={user}
            onBackToHome={() => {
              setCurrentView('home');
              setSelectedToolId(null);
            }}
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
      />
    </div>
  );
}
