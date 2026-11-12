/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Crown,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { User, PlatformLimits } from '../utils/api.js';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { TOOL_PATH_MAP } from '../utils/seoRouter.js';

interface NavbarProps {
  user: User | null;
  limits: PlatformLimits;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onOpenUpgrade: () => void;
  onNavigateHome: () => void;
  onSelectTool: (toolId: ToolId) => void;
  onNavigateDashboard: () => void;
  onNavigateAdmin: () => void;
  onLogout: () => void;
  currentView: 'home' | 'tool' | 'dashboard' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  limits,
  onOpenAuth,
  onOpenUpgrade,
  onNavigateHome,
  onSelectTool,
  onNavigateDashboard,
  onNavigateAdmin,
  onLogout,
  currentView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pdfTools = TOOLS_CONFIG.filter((t) => t.category === 'pdf');
  const aiTools = TOOLS_CONFIG.filter((t) => t.category === 'ai');

  const pdfRemaining = user
    ? user.plan === 'pro'
      ? '∞'
      : Math.max(0, limits.freePdfLimit - user.pdfOperationsUsed)
    : limits.freePdfLimit;

  const aiRemaining = user
    ? user.plan === 'pro'
      ? '∞'
      : Math.max(0, limits.freeAiLimit - user.aiQueriesUsed)
    : limits.freeAiLimit;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            onClick={() => {
              onNavigateHome();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 text-left focus:outline-hidden group cursor-pointer shrink-0"
          >
            <img
              src="/logo.png"
              alt="Omini PDF Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-[#24212A] whitespace-nowrap">
                  Omini<span className="text-[#E83E8C]">PDF</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#FFE3EE] text-[#C92B72] border border-[#FDC6DD]">
                  AI Suite
                </span>
              </div>
              <p className="text-[11px] text-[#77717B] font-medium hidden md:block">
                Smart PDF &amp; Document Intelligence
              </p>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={onNavigateHome}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'home'
                  ? 'text-rose-600 bg-rose-50/70 font-semibold'
                  : 'text-slate-700 hover:text-rose-600 hover:bg-slate-50'
              }`}
            >
              Home
            </button>

            {/* Tools Mega-Dropdown */}
            <div className="relative">
              <button
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                onBlur={() => setTimeout(() => setToolsDropdownOpen(false), 200)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                aria-expanded={toolsDropdownOpen}
              >
                Tools
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[480px] bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Core PDF Tools
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {pdfTools.map((t) => (
                        <a
                          key={t.id}
                          href={TOOL_PATH_MAP[t.id] || '/'}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center justify-between no-underline"
                        >
                          <span>{t.name}</span>
                          {t.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600">
                              {t.badge}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="border-l border-slate-100 pl-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-rose-600 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Intelligence
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {aiTools.map((t) => (
                        <a
                          key={t.id}
                          href={TOOL_PATH_MAP[t.id] || '/'}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center justify-between no-underline"
                        >
                          <span>{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-rose-100 text-rose-700 font-semibold">
                            AI
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/pricing"
              onClick={(e) => {
                e.preventDefault();
                if (currentView !== 'home') {
                  onNavigateHome();
                }
                window.history.pushState({ path: '/pricing' }, '', '/pricing');
                setTimeout(() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors"
            >
              Pricing
            </a>

            <a
              href="/faqs"
              onClick={(e) => {
                e.preventDefault();
                if (currentView !== 'home') {
                  onNavigateHome();
                }
                window.history.pushState({ path: '/faqs' }, '', '/faqs');
                setTimeout(() => {
                  document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors"
            >
              FAQs
            </a>
          </nav>

          {/* Right Header Actions */}
          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {user ? (
              <>
                {/* Usage pill */}
                {user.plan === 'free' && (
                  <div className="hidden lg:flex items-center gap-2 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 transition-colors">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      PDF: <strong className="text-slate-900">{pdfRemaining}</strong> left
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      AI: <strong className="text-slate-900">{aiRemaining}</strong> left
                    </span>
                  </div>
                )}

                {/* Pro Status Badge if Pro */}
                {user.plan === 'pro' && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-[#C92B72] bg-[#FFE3EE] border border-[#FDC6DD] whitespace-nowrap shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#E83E8C]" />
                    <span>Pro Active</span>
                  </div>
                )}

                {/* Upgrade Button if Free */}
                {user.plan === 'free' && (
                  <button
                    onClick={onOpenUpgrade}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-amber-500 via-[#E83E8C] to-[#C92B72] hover:brightness-105 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span className="hidden sm:inline">Upgrade Pro</span>
                    <span className="sm:hidden">Pro</span>
                    <span className="opacity-90 font-mono">₹{limits.proPriceINR ?? 99}</span>
                  </button>
                )}

                {/* Dashboard Shortcut */}
                <button
                  onClick={onNavigateDashboard}
                  className={`hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer items-center gap-1.5 ${
                    currentView === 'dashboard'
                      ? 'bg-rose-50 text-rose-600 font-semibold border border-rose-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Dashboard</span>
                </button>

                {/* Secure Admin Access */}
                {user.role === 'admin' && (
                  <button
                    onClick={onNavigateAdmin}
                    className={`hidden sm:flex px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer items-center gap-1.5 ${
                      currentView === 'admin'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Admin</span>
                  </button>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-rose-400 focus:outline-hidden cursor-pointer"
                    aria-label="User Account Menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-slate-800 to-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              user.plan === 'pro'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {user.plan === 'pro' ? 'Pro 30-Day Plan' : 'Free Tier'}
                          </span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            onNavigateDashboard();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Dashboard &amp; History
                        </button>
                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              onNavigateAdmin();
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg flex items-center gap-2"
                          >
                            <ShieldAlert className="w-4 h-4 text-purple-500" />
                            Admin Console
                          </button>
                        )}
                        {user.plan === 'free' && (
                          <button
                            onClick={() => {
                              onOpenUpgrade();
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                          >
                            <Zap className="w-4 h-4 text-rose-500" />
                            Upgrade to Pro (₹{limits.proPriceINR ?? 99} / Mo)
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            onLogout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Get Started Free
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-in fade-in duration-200">
          <div className="space-y-1">
            <button
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigateDashboard();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Dashboard &amp; History
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  onNavigateAdmin();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50"
              >
                Admin Panel
              </button>
            )}
          </div>

          <div>
            <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">PDF Tools</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {pdfTools.map((t) => (
                <a
                  key={t.id}
                  href={TOOL_PATH_MAP[t.id] || '/'}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 no-underline"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 text-xs font-bold text-rose-600 uppercase tracking-wider">AI Features</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {aiTools.map((t) => (
                <a
                  key={t.id}
                  href={TOOL_PATH_MAP[t.id] || '/'}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 no-underline"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>

          {user && user.plan === 'free' && (
            <button
              onClick={() => {
                onOpenUpgrade();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-linear-to-r from-amber-500 to-rose-600 text-center shadow-md"
            >
              Upgrade to Pro for ₹{limits.proPriceINR ?? 99} / {limits.subscriptionDays ?? 30} Days
            </button>
          )}
        </div>
      )}
    </header>
  );
};
