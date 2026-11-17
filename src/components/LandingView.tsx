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
} from 'lucide-react';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { TOOL_PATH_MAP } from '../utils/seoRouter.js';
import { User, PlatformLimits } from '../utils/api.js';
import { AdSenseBanner } from './AdSenseBanner.js';

interface LandingViewProps {
  user: User | null;
  limits: PlatformLimits;
  onSelectTool: (toolId: ToolId) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  user,
  onSelectTool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'security' | 'license' | null>(null);

  const filteredTools = TOOLS_CONFIG.filter((tool) => {
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
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const faqs = [
    {
      q: 'Is Omini PDF completely free with no paid plans or hidden limits?',
      a: 'Yes! Every single PDF tool on Omini PDF — Merge, Split, Compress, Protect, Watermark, Rotate, Page Numbers, Remove Pages, Edit Metadata, Image to PDF, and PDF to Image — is 100% free forever with unlimited operations and zero watermarks.',
    },
    {
      q: 'Are my PDF documents safe and private?',
      a: 'Yes. All PDF operations execute directly inside your browser using high-speed client-side processing. Your files stay on your device and are never uploaded or stored on public servers.',
    },
    {
      q: 'Do I need to create an account or pay anything to download PDFs?',
      a: 'No account or payment is required to use any PDF tool or download your processed files. Signing in with Google is completely optional and only used if you want to save your document history.',
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
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 bg-gradient-to-b from-[#FFE3EE]/40 via-[#FFF4F8] to-[#FFF4F8]">
        <div className="absolute inset-0 bg-[radial-gradient(#E83E8C_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFE3EE] text-[#C92B72] text-xs font-bold uppercase tracking-wider mb-6 border border-[#FDC6DD] shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971]" />
            <span className="font-serif font-bold italic">100% Free Forever • Client-Side &amp; Ultra Fast</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight leading-[1.18] text-[#24212A]">
            Every PDF Tool You Need. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#E83E8C] via-[#FF2E93] to-[#C92B72] bg-clip-text text-transparent">
              100% Free, Private &amp; Instant.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#77717B] max-w-2xl mx-auto leading-relaxed font-serif italic">
            Merge, split, compress, protect, watermark, rotate, and convert PDFs directly in your browser at lightning speed — with zero limits and zero watermarks.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('tools-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-white bg-gradient-to-r from-[#E83E8C] via-[#D8327E] to-[#C92B72] hover:brightness-105 shadow-lg shadow-[#E83E8C]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Explore All {TOOLS_CONFIG.length} Free Tools</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTool('merge-pdf')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-[#24212A] bg-white hover:bg-[#FFE3EE]/40 border-2 border-[#FFE3EE] hover:border-[#E83E8C] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Combine className="w-4 h-4 text-[#E83E8C]" />
              <span>Merge PDF Free</span>
            </button>
          </div>

          {/* Trust Bar */}
          <div className="mt-12 pt-8 border-t border-[#FFE3EE] flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-serif font-semibold italic text-[#77717B]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
              <span>Strict Privacy &amp; AES-256</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#E83E8C] fill-[#E83E8C]" />
              <span>Sub-Second Browser Speed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <InfinityIcon className="w-4 h-4 text-[#C92B72]" />
              <span>Unlimited Free Operations</span>
            </div>
          </div>

          {/* Primary Hero Showcase Image (High Priority for LCP Optimization) */}
          <div className="mt-10 max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-[#FFE3EE] bg-[#24212A] group">
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

      {/* Tools Section */}
      <section id="tools-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1FA971]/10 text-[#1FA971] text-xs font-bold mb-2 border border-[#1FA971]/25">
              <span>All {TOOLS_CONFIG.length} Tools 100% Free &amp; Unlimited</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold italic text-[#24212A] tracking-tight">
              Powerful Free PDF Tools
            </h2>
            <p className="text-xs sm:text-sm text-[#77717B] mt-1 font-serif italic">
              Select any tool below to process your PDFs instantly — no limits, no watermarks.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#C92B72] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PDF tools..."
              aria-label="Search PDF tools"
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-xs rounded-2xl border-2 border-[#FFE3EE] bg-white text-[#24212A] focus:outline-hidden focus:border-[#E83E8C] font-serif italic shadow-2xs"
            />
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-[#FFE3EE]">
            <p className="text-sm font-bold text-[#24212A]">No matching PDF tools found</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-bold text-[#E83E8C] hover:underline cursor-pointer"
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
                className="bg-white rounded-3xl p-6 border-2 border-[#FFE3EE] hover:border-[#E83E8C] shadow-xs hover:shadow-xl hover:shadow-[#E83E8C]/15 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden text-left no-underline block"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#FFE3EE]/70 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100"></div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-2xs bg-gradient-to-br from-[#FFE3EE] to-[#FFF4F8] border border-[#FDC6DD] text-[#E83E8C] group-hover:bg-gradient-to-r group-hover:from-[#E83E8C] group-hover:to-[#C92B72] group-hover:text-white">
                      {getToolIcon(tool.id)}
                    </div>

                    {tool.badge && (
                      <span
                        className={`text-[10px] font-serif font-bold italic uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          tool.badge === 'Popular'
                            ? 'bg-gradient-to-r from-[#E83E8C] to-[#C92B72] text-white shadow-2xs'
                            : 'bg-[#FFF4F8] text-[#C92B72] border border-[#FFE3EE]'
                        }`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-extrabold italic text-[#24212A] group-hover:text-[#E83E8C] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-[#77717B] mt-1.5 leading-relaxed font-serif italic">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#FFE3EE] flex items-center justify-between text-xs font-serif font-bold italic text-[#E83E8C] group-hover:translate-x-1 transition-transform">
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
        <div className="bg-gradient-to-br from-[#24212A] via-[#3B1226] to-[#550B2E] border border-[#C92B72]/40 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3.5 py-1 rounded-full text-xs font-serif font-bold italic uppercase tracking-wider bg-[#FFE3EE] text-[#C92B72] border border-[#FDC6DD] inline-block mb-3.5 shadow-2xs">
              Zero Fees • Zero Watermarks
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold italic tracking-tight leading-tight">
              Unlimited PDF Processing — 100% Free Forever
            </h2>
            <p className="mt-3 text-rose-100/90 text-xs sm:text-sm leading-relaxed font-serif italic">
              No paywalls, no daily file caps, and no hidden subscriptions. Every document tool runs securely right inside your browser with instant live previews.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSelectTool('compress-pdf')}
                className="px-7 py-3.5 rounded-2xl font-serif font-bold italic text-sm text-white bg-gradient-to-r from-[#E83E8C] via-[#FF2E93] to-[#C92B72] hover:brightness-105 shadow-xl shadow-[#E83E8C]/30 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
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
          <span className="text-xs font-bold text-[#E83E8C] uppercase tracking-wider">
            Got Questions?
          </span>
          <h2 className="text-3xl font-extrabold text-[#24212A] tracking-tight mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#FFE3EE] overflow-hidden shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm text-[#24212A] hover:text-[#E83E8C] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === idx ? 'rotate-180 text-[#E83E8C]' : 'text-[#77717B]'
                  }`}
                />
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-5 text-xs text-[#77717B] leading-relaxed border-t border-[#FFF4F8] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#FFE3EE] pt-12 pb-16 text-xs text-[#77717B] cv-auto">
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
            <span className="font-extrabold text-[#24212A] text-sm">
              Omini<span className="text-[#E83E8C]">PDF</span>
            </span>
            <span className="text-[#77717B]">• 100% Free Online PDF Suite</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span className="text-[#77717B] font-medium">© 2026 Omini PDF. Built by Code Garage. Developed by SM Developer.</span>
            <button
              type="button"
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-[#24212A] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-[#24212A] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('security')}
              className="hover:text-[#24212A] transition-colors cursor-pointer"
            >
              Security Safeguards
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalModal('license')}
              className="hover:text-[#E83E8C] font-semibold text-[#24212A] transition-colors cursor-pointer underline decoration-[#E83E8C]/40 underline-offset-4"
            >
              License & Copyright
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-[#FFE3EE]">
            <div className="px-6 py-4 border-b border-[#FFE3EE] flex items-center justify-between bg-[#FFF4F8]">
              <h3 className="font-bold text-[#24212A] text-base">
                {activeLegalModal === 'privacy' && 'Privacy Policy'}
                {activeLegalModal === 'terms' && 'Terms of Service'}
                {activeLegalModal === 'security' && 'Security Safeguards'}
                {activeLegalModal === 'license' && 'License, Copyright & Intellectual Property Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 text-[#77717B] hover:text-[#24212A] hover:bg-[#FFE3EE] rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#24212A] leading-relaxed">
              {activeLegalModal === 'license' && (
                <>
                  <div className="p-3 bg-[#FFF4F8] border border-[#FDC6DD] rounded-xl mb-3 text-[#C92B72] text-xs">
                    <strong>Official Notice:</strong> Copyright © 2026 Omini PDF / Code Garage / SM Developer. All Rights Reserved. Protected under Indian Copyright Act, 1957 &amp; International Treaties.
                  </div>
                  <h4 className="font-bold text-[#24212A]">1. Proprietary Software Ownership</h4>
                  <p>
                    All source code, UI designs, brand assets (`logo.png`, `Social Sharing Preview Image.png`), workflows, and algorithms of Omini PDF are the exclusive proprietary property of Code Garage and SM Developer.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">2. End-User License Agreement (EULA)</h4>
                  <p>
                    Users are granted a free, non-exclusive, non-transferable, revocable license to use the web application for personal, business, or academic document processing. Unauthorized copying, distribution, decompilation, cloning, reverse engineering, or resale of any portion of this codebase is strictly prohibited.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">3. User Content &amp; Intellectual Property</h4>
                  <p>
                    Users retain 100% ownership and copyright over their uploaded PDF files, images, and documents. Omini PDF claims zero ownership over user files and does not sell or distribute document contents.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">4. Commercial Licensing &amp; Inquiries</h4>
                  <p>
                    For custom enterprise licensing or white-label inquiries, contact: <strong>sm2008developer@gmail.com / codegarage1@gmail.com</strong>.
                  </p>
                </>
              )}

              {activeLegalModal === 'privacy' && (
                <>
                  <p className="font-semibold text-[#24212A]">Last updated: November 2026</p>
                  <p>
                    Omini PDF (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated by Code Garage and developed by SM Developer, respects your privacy and is committed to protecting your personal data.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">1. Client-Side Zero-Retention Processing</h4>
                  <p>
                    All PDF tools (merging, splitting, compression, watermarking, rotation, page numbering, metadata editing, and image conversions) run directly inside your browser. Your documents never leave your device unless you choose to save optional processing logs to your signed-in account.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">2. Optional Account Data</h4>
                  <p>
                    If you choose to sign in with Google, we store only your name, email, and document operation metadata to power your personal history dashboard.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">3. Contact Us</h4>
                  <p>For privacy inquiries, please contact: <strong>sm2008developer@gmail.com / codegarage1@gmail.com</strong>.</p>
                </>
              )}

              {activeLegalModal === 'terms' && (
                <>
                  <p className="font-semibold text-[#24212A]">Effective Date: November 2026</p>
                  <p>
                    Welcome to Omini PDF. By accessing or using our free PDF tools built by Code Garage and developed by SM Developer, you agree to comply with these Terms of Service.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">1. 100% Free Unlimited Access</h4>
                  <p>
                    All 11 PDF tools on Omini PDF are completely free for personal, academic, and business use with unlimited document operations.
                  </p>
                  <h4 className="font-bold text-[#24212A] mt-3">2. Acceptable Use</h4>
                  <p>
                    You agree not to upload malicious payloads or attempt to disrupt or compromise platform infrastructure.
                  </p>
                </>
              )}

              {activeLegalModal === 'security' && (
                <>
                  <p className="font-semibold text-[#24212A]">Browser-First Security Infrastructure</p>
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
            <div className="px-6 py-3 bg-[#FFF4F8] border-t border-[#FFE3EE] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 bg-[#24212A] hover:bg-[#550B2E] text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
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
