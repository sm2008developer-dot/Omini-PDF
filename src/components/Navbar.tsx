/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  History,
} from 'lucide-react';
import { User, PlatformLimits } from '../utils/api.js';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { TOOL_PATH_MAP } from '../utils/seoRouter.js';

interface NavbarProps {
  user: User | null;
  limits: PlatformLimits;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onNavigateHome: () => void;
  onSelectTool: (toolId: ToolId) => void;
  onNavigateDashboard: () => void;
  onNavigateAdmin: () => void;
  onLogout: () => void;
  currentView: 'home' | 'tool' | 'dashboard' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
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
  const photoTools = TOOLS_CONFIG.filter((t) => t.category !== 'pdf');

  return (
    <header className="sticky top-0 z-50 bg-[#0B0007]/95 backdrop-blur-md border-b border-[#452035] shadow-md shadow-black/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => {
              onNavigateHome();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 text-left focus:outline-hidden group cursor-pointer shrink-0"
          >
            <img
              src="/logo.png"
              alt="Omini PDF Logo"
              width={40}
              height={40}
              decoding="async"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform ring-1 ring-[#452035]"
            />
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white whitespace-nowrap">
                  Omini<span className="text-[#FF4DB8]">PDF</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#35001F] text-[#FF4DB8] border border-[#452035]">
                  100% Free
                </span>
              </div>
              <p className="text-[11px] text-[#91808C] font-medium hidden md:block">
                Fast, Private &amp; Free PDF Suite
              </p>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                currentView === 'home'
                  ? 'text-[#FF4DB8] bg-[#35001F] font-semibold border border-[#452035]'
                  : 'text-[#C8B8C4] hover:text-white hover:bg-[#16000D]'
              }`}
            >
              Home
            </button>

            {/* Tools Mega-Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                onBlur={() => setTimeout(() => setToolsDropdownOpen(false), 200)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[#C8B8C4] hover:text-white hover:bg-[#16000D] transition-colors cursor-pointer"
                aria-expanded={toolsDropdownOpen}
              >
                All Tools ({TOOLS_CONFIG.length})
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[540px] max-h-[75vh] overflow-y-auto bg-[#16000D] rounded-2xl shadow-2xl shadow-black/70 border border-[#452035] p-4 animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#FF4DB8] uppercase tracking-wider mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#FF1493]" />
                      PDF Tools ({pdfTools.length})
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {pdfTools.map((t) => (
                        <a
                          key={t.id}
                          href={TOOL_PATH_MAP[t.id] || '/'}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-[#C8B8C4] hover:text-white hover:bg-[#35001F] transition-colors flex items-center justify-between gap-2 no-underline"
                        >
                          <span className="truncate">{t.name}</span>
                          {t.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#35001F] text-[#FF4DB8] border border-[#452035] font-semibold shrink-0">
                              {t.badge}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#452035]">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#FF4DB8] uppercase tracking-wider mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#FF1493]" />
                      Photo Studio &amp; Rename ({photoTools.length})
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {photoTools.map((t) => (
                        <a
                          key={t.id}
                          href={TOOL_PATH_MAP[t.id] || '/'}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(t.id);
                            setToolsDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-[#C8B8C4] hover:text-white hover:bg-[#35001F] transition-colors flex items-center justify-between gap-2 no-underline"
                        >
                          <span className="truncate">{t.name}</span>
                          {t.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#35001F] text-[#FF4DB8] border border-[#452035] font-semibold shrink-0">
                              {t.badge}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onNavigateDashboard}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'text-[#FF4DB8] bg-[#35001F] font-semibold border border-[#452035]'
                  : 'text-[#C8B8C4] hover:text-white hover:bg-[#16000D]'
              }`}
            >
              <History className="w-4 h-4 text-[#FF4DB8]" />
              <span>History</span>
            </button>

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
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#C8B8C4] hover:text-white hover:bg-[#16000D] transition-colors"
            >
              FAQs
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#1FA971] bg-[#1FA971]/15 border border-[#1FA971]/35">
              Unlimited &amp; Free
            </span>

            {/* Quick History button on mobile/tablet bar so users find it immediately */}
            <button
              type="button"
              onClick={() => {
                onNavigateDashboard();
                setMobileMenuOpen(false);
              }}
              className={`md:hidden px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                currentView === 'dashboard'
                  ? 'bg-[#35001F] text-[#FF4DB8] border border-[#FF1493]'
                  : 'bg-[#16000D] text-[#C8B8C4] hover:text-white hover:bg-[#35001F] border border-[#452035]'
              }`}
              aria-label="Open History"
            >
              <History className="w-3.5 h-3.5 text-[#FF4DB8]" />
              <span className="hidden xs:inline">History</span>
            </button>

            {user ? (
              <>
                <button
                  type="button"
                  onClick={onNavigateDashboard}
                  className={`hidden md:flex px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer items-center gap-1.5 ${
                    currentView === 'dashboard'
                      ? 'bg-[#35001F] text-[#FF4DB8] font-semibold border border-[#FF1493]'
                      : 'bg-[#16000D] text-[#C8B8C4] hover:text-white hover:bg-[#35001F] border border-[#452035]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={onNavigateAdmin}
                    className={`hidden sm:flex px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer items-center gap-1.5 ${
                      currentView === 'admin'
                        ? 'bg-[#E90083] text-white'
                        : 'bg-[#35001F] text-[#FF4DB8] hover:bg-[#E90083] hover:text-white border border-[#452035]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Admin</span>
                  </button>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-[#FF1493] focus:outline-hidden cursor-pointer"
                    aria-label="User Account Menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#E90083] to-[#FF4DB8] text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-[#E90083]/30">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-[#16000D] rounded-2xl shadow-2xl shadow-black/70 border border-[#452035] p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      <div className="px-3 py-2 border-b border-[#452035]">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-[#91808C] truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1FA971]/15 text-[#1FA971]">
                            Unlimited Free Plan
                          </span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#35001F] text-[#FF4DB8] border border-[#452035]">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateDashboard();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-[#C8B8C4] hover:text-white hover:bg-[#35001F] rounded-lg flex items-center gap-2 cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#FF4DB8]" />
                          Dashboard &amp; History
                        </button>
                        {user.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateAdmin();
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-[#FF4DB8] hover:bg-[#35001F] rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldAlert className="w-4 h-4 text-[#FF1493]" />
                            Admin Console
                          </button>
                        )}
                      </div>

                      <div className="border-t border-[#452035] pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onLogout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-[#D9364F] hover:bg-[#35001F] rounded-lg flex items-center gap-2 cursor-pointer"
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
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] shadow-sm shadow-[#E90083]/30 transition-all cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#C8B8C4] hover:text-white hover:bg-[#35001F] focus:outline-hidden cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#452035] bg-[#0B0007] px-4 pt-3 pb-6 space-y-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-200">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-[#35001F]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigateDashboard();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-[#35001F] flex items-center gap-2"
            >
              <History className="w-4 h-4 text-[#FF4DB8]" />
              <span>{user ? 'Dashboard & History' : 'Processing History'}</span>
            </button>
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onNavigateAdmin();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#FF4DB8] hover:bg-[#35001F]"
              >
                Admin Panel
              </button>
            )}
          </div>

          <div>
            <p className="px-3 text-xs font-bold text-[#FF4DB8] uppercase tracking-wider">
              PDF Tools ({pdfTools.length})
            </p>
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
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-[#C8B8C4] hover:bg-[#35001F] hover:text-white no-underline truncate"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#452035]">
            <p className="px-3 text-xs font-bold text-[#FF4DB8] uppercase tracking-wider">
              Photo Studio &amp; Rename ({photoTools.length})
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {photoTools.map((t) => (
                <a
                  key={t.id}
                  href={TOOL_PATH_MAP[t.id] || '/'}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium text-[#C8B8C4] hover:bg-[#35001F] hover:text-white no-underline truncate"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
