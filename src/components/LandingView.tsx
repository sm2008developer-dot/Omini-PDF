/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Combine,
  Split,
  Minimize2,
  Lock,
  Stamp,
  FileImage,
  ImageDown,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Search,
  ChevronDown,
  FileEdit,
  RotateCw,
  Hash,
  Trash2,
  Infinity as InfinityIcon,
  Highlighter,
  Scaling,
  SlidersHorizontal,
  PenTool,
  FileSignature,
  Unlock,
  ScanText,
  FileSpreadsheet,
  Table,
  PenLine,
  Clock,
  X,
} from 'lucide-react';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { TOOL_PATH_MAP } from '../utils/seoRouter.js';
import { User, PlatformLimits } from '../utils/api.js';
import { AdSenseBanner } from './AdSenseBanner.js';

interface LandingViewProps {
  user: User | null;
  limits: PlatformLimits;
  recentToolIds?: ToolId[];
  onClearRecentTools?: () => void;
  onSelectTool: (toolId: ToolId) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  user,
  recentToolIds = [],
  onClearRecentTools,
  onSelectTool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'pdf' | 'image' | 'utility'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'security' | 'license' | null>(null);

  const recentTools = recentToolIds
    .map((id) => TOOLS_CONFIG.find((t) => t.id === id))
    .filter((t): t is (typeof TOOLS_CONFIG)[number] => Boolean(t));

  const pdfCount = TOOLS_CONFIG.filter((t) => t.category === 'pdf').length;
  const imageCount = TOOLS_CONFIG.filter((t) => t.category === 'image').length;
  const utilityCount = TOOLS_CONFIG.filter((t) => t.category === 'utility').length;

  const filteredTools = TOOLS_CONFIG.filter((tool) => {
    if (activeCategory !== 'all' && tool.category !== activeCategory) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.tagline.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q)
    );
  });

  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case 'merge-pdf':
        return <Combine className="w-5 h-5" />;
      case 'split-pdf':
        return <Split className="w-5 h-5" />;
      case 'compress-pdf':
      case 'compress-image':
        return <Minimize2 className="w-5 h-5" />;
      case 'protect-pdf':
        return <Lock className="w-5 h-5" />;
      case 'watermark-pdf':
        return <Stamp className="w-5 h-5" />;
      case 'image-to-pdf':
        return <FileImage className="w-5 h-5" />;
      case 'pdf-to-image':
        return <ImageDown className="w-5 h-5" />;
      case 'edit-metadata':
        return <FileEdit className="w-5 h-5" />;
      case 'rotate-pdf':
        return <RotateCw className="w-5 h-5" />;
      case 'page-numbers':
        return <Hash className="w-5 h-5" />;
      case 'remove-pages':
        return <Trash2 className="w-5 h-5" />;
      case 'highlight-pdf':
      case 'highlight-photo':
        return <Highlighter className="w-5 h-5" />;
      case 'resize-image':
        return <Scaling className="w-5 h-5" />;
      case 'edit-photo':
        return <SlidersHorizontal className="w-5 h-5" />;
      case 'pdf-to-word':
        return <FileText className="w-5 h-5" />;
      case 'word-to-pdf':
        return <FileSpreadsheet className="w-5 h-5" />;
      case 'pdf-to-excel':
        return <Table className="w-5 h-5" />;
      case 'edit-pdf':
        return <PenTool className="w-5 h-5" />;
      case 'sign-pdf':
        return <FileSignature className="w-5 h-5" />;
      case 'unlock-pdf':
        return <Unlock className="w-5 h-5" />;
      case 'ocr-pdf':
        return <ScanText className="w-5 h-5" />;
      case 'rename-files':
        return <PenLine className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const faqs = [
    {
      q: 'Is Omini PDF completely free with no paid plans or hidden limits?',
      a: `Yes! All ${TOOLS_CONFIG.length} PDF, Photo, and Utility tools on Omini PDF — including PDF to Word, Word to PDF, PDF to Excel, Edit PDF, Sign PDF, Unlock PDF, OCR PDF, JPG/PNG to PDF, Photo Compressor, Aspect Ratio Converter, and Batch Rename — are 100% free forever with unlimited operations.`,
    },
    {
      q: 'Are my PDF documents safe and private?',
      a: 'Yes. All PDF operations execute directly inside your browser using high-speed client-side processing. Your files stay on your device and are never uploaded or stored on public servers.',
    },
    {
      q: 'Do I need to create an account or pay anything to download PDFs?',
      a: 'No account or payment is required. Login is 100% optional: if you sign in, your PDF history saves to your Account; if you continue without logging in, your history saves automatically in your Browser Local Storage.',
    },
    {
      q: 'Can I split PDFs into individual pages or custom page ranges?',
      a: 'Yes! The Split PDF tool supports extracting exact page ranges (e.g., 1-3, 5) into a new PDF, or separating every single page and downloading them bundled into a single ZIP file.',
    },
    {
      q: 'Can I preview my updated PDF before downloading?',
      a: 'Yes! After uploading or processing any PDF, you can inspect the live document preview directly on screen or open the full-screen interactive page viewer before saving.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 bg-gradient-to-b from-[#35001F]/45 via-[#0B0007] to-[#050005]">
        {/* Subtle Ambient Pink Lighting */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[780px] h-[360px] rounded-full bg-[#E90083]/18 blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#FF1493_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#35001F] text-[#FF4DB8] text-xs font-bold uppercase tracking-wider mb-6 border border-[#452035] shadow-sm shadow-[#E90083]/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971]" />
            <span className="font-serif font-bold italic">100% Free Forever • Client-Side &amp; Ultra Fast</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight leading-[1.18] text-white">
            Every PDF &amp; Photo Tool You Need. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#E90083] via-[#FF1493] to-[#FF4DB8] bg-clip-text text-transparent">
              100% Free, Private &amp; Instant.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#C8B8C4] max-w-2xl mx-auto leading-relaxed font-serif italic">
            Convert PDF to Word &amp; Excel, Word to PDF, Edit &amp; Sign PDF, Unlock &amp; OCR scanned documents, convert JPG/PNG to PDF, compress &amp; edit photos directly in your browser — zero AI, zero limits, zero watermarks.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('tools-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-white bg-gradient-to-r from-[#E90083] to-[#FF1493] hover:brightness-110 active:bg-[#C90070] shadow-lg shadow-[#E90083]/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Explore All {TOOLS_CONFIG.length} Free Tools</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTool('merge-pdf')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-white bg-[#16000D] hover:bg-[#35001F] border border-[#452035] hover:border-[#FF1493] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Combine className="w-4 h-4 text-[#FF4DB8]" />
              <span>Merge PDF Free</span>
            </button>
          </div>

          {/* Trust Bar */}
          <div className="mt-12 pt-8 border-t border-[#452035] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-serif font-semibold italic text-[#C8B8C4]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
              <span>Strict Privacy &amp; AES-256</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#FF1493] fill-[#FF1493]" />
              <span>Sub-Second Browser Speed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <InfinityIcon className="w-4 h-4 text-[#FF4DB8]" />
              <span>No Login Required • Local or Account History</span>
            </div>
          </div>

          {/* Primary Hero Showcase Image (High Priority for LCP Optimization) */}
          <div className="mt-10 max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-[#E90083]/10 border border-[#452035] bg-[#16000D] group">
            <img
              src="/assets/omini-hero-showcase.svg"
              alt="Omini PDF Free Online PDF Editor Preview"
              width={1200}
              height={630}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="w-full h-auto object-cover rounded-3xl transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </div>
        </div>
      </section>

      {/* AdSense Responsive Banner Unit */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSenseBanner
          slotId="5477575344"
          user={user}
          layout="responsive"
        />
      </div>

      {/* Recently Used Tools Section (Last 3 tools persisted in localStorage) */}
      {recentTools.length > 0 && (
        <section
          id="recently-used"
          aria-label="Recently Used Tools"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="bg-[#16000D] rounded-3xl p-5 sm:p-6 border border-[#452035]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#35001F] border border-[#452035] text-[#FF4DB8] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-serif font-extrabold italic text-white leading-tight">
                    Recently Used
                  </h2>
                  <p className="text-[11px] text-[#91808C] font-serif italic">
                    Quick jump back to your last {recentTools.length} tool{recentTools.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {onClearRecentTools && (
                <button
                  type="button"
                  onClick={onClearRecentTools}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#C8B8C4] hover:text-[#D9364F] hover:bg-[#35001F] border border-[#452035] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {recentTools.map((tool) => (
                <a
                  key={`recent-${tool.id}`}
                  href={TOOL_PATH_MAP[tool.id] || '/'}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(tool.id);
                  }}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#0B0007] hover:bg-[#35001F]/70 border border-[#452035] hover:border-[#FF1493] transition-all group no-underline cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#16000D] border border-[#452035] text-[#FF4DB8] group-hover:bg-gradient-to-r group-hover:from-[#E90083] group-hover:to-[#FF1493] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                      {getToolIcon(tool.id)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-serif font-extrabold italic text-white group-hover:text-[#FF4DB8] truncate">
                        {tool.name}
                      </h3>
                      <p className="text-[11px] text-[#91808C] truncate font-serif italic">
                        {tool.tagline}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#FF4DB8] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tools Section */}
      <section id="tools-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1FA971]/15 text-[#1FA971] text-xs font-bold mb-2 border border-[#1FA971]/35">
              <span>All {TOOLS_CONFIG.length} Tools 100% Free &amp; Unlimited</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold italic text-white tracking-tight">
              Powerful Free PDF &amp; Photo Tools
            </h2>
            <p className="text-xs sm:text-sm text-[#C8B8C4] mt-1 font-serif italic">
              Select any tool below to process your PDFs &amp; photos instantly — pure browser libraries, zero AI, zero watermarks.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#FF4DB8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PDF or photo tools..."
              aria-label="Search PDF and photo tools"
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-xs rounded-2xl border border-[#452035] bg-[#12000A] text-white placeholder-[#91808C] focus:outline-hidden focus:border-[#FF1493] font-serif italic"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-7" role="tablist" aria-label="Tool categories">
          {[
            { id: 'all' as const, label: `All Tools (${TOOLS_CONFIG.length})` },
            { id: 'pdf' as const, label: `PDF Tools (${pdfCount})` },
            { id: 'image' as const, label: `Photo Studio (${imageCount})` },
            { id: 'utility' as const, label: `Rename & Utility (${utilityCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-serif font-bold italic transition-all cursor-pointer border ${
                activeCategory === tab.id
                  ? 'bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] text-white border-[#FF1493] shadow-sm shadow-[#E90083]/25'
                  : 'bg-[#16000D] text-[#C8B8C4] border-[#452035] hover:border-[#FF1493] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-[#16000D] rounded-3xl border border-[#452035]">
            <p className="text-sm font-bold text-white">No matching tools found</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="mt-3 text-xs font-bold text-[#FF4DB8] hover:underline cursor-pointer"
            >
              Show all {TOOLS_CONFIG.length} tools
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTools.map((tool) => (
              <a
                key={tool.id}
                href={TOOL_PATH_MAP[tool.id] || '/'}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTool(tool.id);
                }}
                className="bg-[#16000D] rounded-3xl p-6 border border-[#452035] hover:border-[#FF1493] hover:bg-[#1B0010] hover:shadow-lg hover:shadow-[#FF1493]/15 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden text-left no-underline block"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#35001F]/70 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100"></div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 bg-[#35001F] border border-[#452035] text-[#FF4DB8] group-hover:bg-gradient-to-r group-hover:from-[#E90083] group-hover:to-[#FF1493] group-hover:text-white group-hover:border-[#FF1493]">
                      {getToolIcon(tool.id)}
                    </div>

                    {tool.badge && (
                      <span
                        className={`text-[10px] font-serif font-bold italic uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          tool.badge === 'Popular'
                            ? 'bg-gradient-to-r from-[#E90083] to-[#FF1493] text-white'
                            : 'bg-[#35001F] text-[#FF4DB8] border border-[#452035]'
                        }`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-extrabold italic text-white group-hover:text-[#FF4DB8] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-[#C8B8C4] mt-1.5 leading-relaxed font-serif italic">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#452035] flex items-center justify-between text-xs font-serif font-bold italic text-[#FF4DB8] group-hover:translate-x-1 transition-transform">
                  <span>Open Free Tool</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Free Promise Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 cv-auto">
        <div className="bg-gradient-to-br from-[#16000D] via-[#35001F] to-[#16000D] border border-[#452035] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3.5 py-1 rounded-full text-xs font-serif font-bold italic uppercase tracking-wider bg-[#35001F] text-[#FF4DB8] border border-[#FF1493]/40 inline-block mb-3.5">
              Zero Fees • Zero Watermarks
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold italic tracking-tight leading-tight text-white">
              Unlimited PDF Processing — 100% Free Forever
            </h2>
            <p className="mt-3 text-[#C8B8C4] text-xs sm:text-sm leading-relaxed font-serif italic">
              No paywalls, no daily file caps, and no hidden subscriptions. Every document tool runs securely right inside your browser with instant live previews.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSelectTool('compress-pdf')}
                className="px-7 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-white bg-gradient-to-r from-[#E90083] to-[#FF1493] hover:brightness-110 active:bg-[#C90070] shadow-lg shadow-[#E90083]/30 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Start Processing PDFs Free</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Feature/Bottom Banner Unit */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <AdSenseBanner
          slotId="9309009142"
          user={user}
          layout="responsive"
        />
      </div>

      {/* Interactive FAQ Section */}
      <section id="faqs" className="max-w-4xl mx-auto px-4 sm:px-6 cv-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#FF4DB8] uppercase tracking-wider">
            Got Questions?
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#16000D] rounded-2xl border border-[#452035] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-[#FF4DB8] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === idx ? 'rotate-180 text-[#FF1493]' : 'text-[#C8B8C4]'
                  }`}
                />
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-5 text-xs text-[#C8B8C4] leading-relaxed border-t border-[#452035] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#452035] bg-[#0B0007] pt-12 pb-16 text-xs text-[#91808C] cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Omini PDF Logo"
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className="w-8 h-8 rounded-lg shadow-xs object-contain"
            />
            <span className="font-extrabold text-white text-sm">
              Omini<span className="text-[#FF4DB8]">PDF</span>
            </span>
            <span className="text-[#91808C]">• 100% Free Online PDF Suite</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span className="text-[#91808C] font-medium">© 2026 Omini PDF. Built by Code Garage. Developed by SM Developer.</span>
            <button
              type="button"
              onClick={() => setActiveLegalModal('privacy')}
              className="text-[#C8B8C4] hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('terms')}
              className="text-[#C8B8C4] hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('security')}
              className="text-[#C8B8C4] hover:text-white transition-colors cursor-pointer"
            >
              Security Safeguards
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('license')}
              className="hover:text-[#FF4DB8] font-semibold text-white transition-colors cursor-pointer underline decoration-[#FF4DB8]/50 underline-offset-4"
            >
              License & Copyright
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#16000D] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-[#452035]">
            <div className="px-6 py-4 border-b border-[#452035] flex items-center justify-between bg-[#0B0007]">
              <h3 className="font-bold text-white text-base">
                {activeLegalModal === 'privacy' && 'Privacy Policy'}
                {activeLegalModal === 'terms' && 'Terms of Service'}
                {activeLegalModal === 'security' && 'Security Safeguards'}
                {activeLegalModal === 'license' && 'License, Copyright & Intellectual Property Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 text-[#C8B8C4] hover:text-white hover:bg-[#35001F] rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#C8B8C4] leading-relaxed">
              {activeLegalModal === 'license' && (
                <>
                  <div className="p-3 bg-[#35001F] border border-[#452035] rounded-xl mb-3 text-[#FF4DB8] text-xs">
                    <strong>Official Notice:</strong> Copyright © 2026 Omini PDF / Code Garage / SM Developer. All Rights Reserved. Protected under Indian Copyright Act, 1957 &amp; International Treaties.
                  </div>
                  <h4 className="font-bold text-white">1. Proprietary Software Ownership</h4>
                  <p>
                    All source code, UI designs, brand assets (`logo.png`, `Social Sharing Preview Image.png`), workflows, and algorithms of Omini PDF are the exclusive proprietary property of Code Garage and SM Developer.
                  </p>
                  <h4 className="font-bold text-white mt-3">2. End-User License Agreement (EULA)</h4>
                  <p>
                    Users are granted a free, non-exclusive, non-transferable, revocable license to use the web application for personal, business, or academic document processing. Unauthorized copying, distribution, decompilation, cloning, reverse engineering, or resale of any portion of this codebase is strictly prohibited.
                  </p>
                  <h4 className="font-bold text-white mt-3">3. User Content &amp; Intellectual Property</h4>
                  <p>
                    Users retain 100% ownership and copyright over their uploaded PDF files, images, and documents. Omini PDF claims zero ownership over user files and does not sell or distribute document contents.
                  </p>
                  <h4 className="font-bold text-white mt-3">4. Commercial Licensing &amp; Inquiries</h4>
                  <p>
                    For custom enterprise licensing or white-label inquiries, contact: <strong className="text-white">sm2008developer@gmail.com / codegarage1@gmail.com</strong>.
                  </p>
                </>
              )}

              {activeLegalModal === 'privacy' && (
                <>
                  <p className="font-semibold text-white">Last updated: November 2026</p>
                  <p>
                    Omini PDF (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated by Code Garage and developed by SM Developer, respects your privacy and is committed to protecting your personal data.
                  </p>
                  <h4 className="font-bold text-white mt-3">1. Client-Side Zero-Retention Processing</h4>
                  <p>
                    All PDF tools (merging, splitting, compression, watermarking, rotation, page numbering, metadata editing, and image conversions) run directly inside your browser. Your documents never leave your device unless you choose to save optional processing logs to your signed-in account.
                  </p>
                  <h4 className="font-bold text-white mt-3">2. Optional Account Data</h4>
                  <p>
                    If you choose to sign in with Google, we store only your name, email, and document operation metadata to power your personal history dashboard.
                  </p>
                  <h4 className="font-bold text-white mt-3">3. Contact Us</h4>
                  <p>For privacy inquiries, please contact: <strong className="text-white">sm2008developer@gmail.com / codegarage1@gmail.com</strong>.</p>
                </>
              )}

              {activeLegalModal === 'terms' && (
                <>
                  <p className="font-semibold text-white">Effective Date: November 2026</p>
                  <p>
                    Welcome to Omini PDF. By accessing or using our free PDF tools built by Code Garage and developed by SM Developer, you agree to comply with these Terms of Service.
                  </p>
                  <h4 className="font-bold text-white mt-3">1. 100% Free Unlimited Access</h4>
                  <p>
                    All {TOOLS_CONFIG.length} PDF, Photo, and Utility tools on Omini PDF are completely free for personal, academic, and business use with unlimited document operations.
                  </p>
                  <h4 className="font-bold text-white mt-3">2. Acceptable Use</h4>
                  <p>
                    You agree not to upload malicious payloads or attempt to disrupt or compromise platform infrastructure.
                  </p>
                </>
              )}

              {activeLegalModal === 'security' && (
                <>
                  <p className="font-semibold text-white">Browser-First Security Infrastructure</p>
                  <p>
                    Omini PDF, engineered by Code Garage and SM Developer, prioritizes document safety:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>100% client-side PDF rendering and manipulation in sandboxed browser memory.</li>
                    <li>256-bit SSL/TLS encryption for all network communications.</li>
                    <li>256-bit AES document encryption when using the Protect PDF tool.</li>
                    <li>Zero third-party document storage or unauthorized data sharing.</li>
                  </ul>
                </>
              )}
            </div>
            <div className="px-6 py-3 bg-[#0B0007] border-t border-[#452035] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
