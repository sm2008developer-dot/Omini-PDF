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
            className="flex items-center gap-2.5 text-left focus:outline-hidden group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Omini<span className="text-rose-600">PDF</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                  AI Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
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
                        <button
                          key={t.id}
                          onClick={() => {
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center justify-between"
                        >
                          <span>{t.name}</span>
                          {t.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600">
                              {t.badge}
                            </span>
                          )}
                        </button>
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
                        <button
                          key={t.id}
                          onClick={() => {
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center justify-between"
                        >
                          <span>{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-rose-100 text-rose-700 font-semibold">
                            AI
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a
              href="#pricing"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  onNavigateHome();
                  setTimeout(() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors"
            >
              Pricing
            </a>

            <a
              href="#faqs"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  onNavigateHome();
                  setTimeout(() => {
                    document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors"
            >
              FAQs
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user ? (
              <>
                {/* Usage pill */}
                {user.plan === 'free' ? (
                  <div className="hidden sm:flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 transition-colors">
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
                ) : (
                  <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-linear-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 text-amber-700 border border-amber-300/80 shadow-2xs">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>PRO Active</span>
                  </div>
                )}

                {/* Upgrade Button if Free */}
                {user.plan === 'free' && (
                  <button
                    onClick={onOpenUpgrade}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-amber-500 via-rose-500 to-rose-600 hover:brightness-105 shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span className="hidden sm:inline">Upgrade Pro</span>
                    <span className="sm:hidden">Pro</span>
                    <span className="opacity-90 font-mono">₹99</span>
                  </button>
                )}

                {/* Dashboard Shortcut */}
                <button
                  onClick={onNavigateDashboard}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'dashboard'
                      ? 'bg-rose-50 text-rose-600 font-semibold border border-rose-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Dashboard</span>
                </button>

                {/* Secure Admin Access: Only shown when authenticated user is authorized admin */}
                {user.role === 'admin' && user.email.toLowerCase() === 'codegarage1@gmail.com' && (
                  <button
                    onClick={onNavigateAdmin}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
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
                          {user.role === 'admin' && user.email.toLowerCase() === 'codegarage1@gmail.com' && (
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
                        {user.role === 'admin' && user.email.toLowerCase() === 'codegarage1@gmail.com' && (
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
                            Upgrade to Pro (₹99 / Mo)
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
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
              </>
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
            {user?.role === 'admin' && user?.email.toLowerCase() === 'codegarage1@gmail.com' && (
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
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 text-xs font-bold text-rose-600 uppercase tracking-wider">AI Features</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {aiTools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600"
                >
                  {t.name}
                </button>
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
              Upgrade to Pro for ₹99 / 30 Days
            </button>
          )}
        </div>
      )}
    </header>
  );
};
