/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Combine,
  Split,
  Minimize2,
  Lock,
  Stamp,
  FileImage,
  ImageDown,
  MessageSquare,
  ListOrdered,
  HelpCircle,
  Crown,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Search,
  ChevronDown,
  Star,
  Users,
  Shield,
  Clock,
} from 'lucide-react';
import { ToolId, ToolDefinition, TOOLS_CONFIG } from '../types.js';
import { User, PlatformLimits } from '../utils/api.js';

interface LandingViewProps {
  user: User | null;
  limits: PlatformLimits;
  onSelectTool: (toolId: ToolId) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenUpgrade: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  user,
  limits,
  onSelectTool,
  onOpenAuth,
  onOpenUpgrade,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pdf' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'security' | null>(null);

  const filteredTools = TOOLS_CONFIG.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case 'merge-pdf':
        return <Combine className="w-5 h-5 text-rose-600" />;
      case 'split-pdf':
        return <Split className="w-5 h-5 text-rose-600" />;
      case 'compress-pdf':
        return <Minimize2 className="w-5 h-5 text-rose-600" />;
      case 'protect-pdf':
        return <Lock className="w-5 h-5 text-rose-600" />;
      case 'watermark-pdf':
        return <Stamp className="w-5 h-5 text-rose-600" />;
      case 'image-to-pdf':
        return <FileImage className="w-5 h-5 text-rose-600" />;
      case 'pdf-to-image':
        return <ImageDown className="w-5 h-5 text-rose-600" />;
      case 'ai-summarizer':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'ai-chat':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'ai-keypoints':
        return <ListOrdered className="w-5 h-5 text-purple-600" />;
      case 'ai-qa':
        return <HelpCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-rose-600" />;
    }
  };

  const faqs = [
    {
      q: 'How does the ₹99 Pro plan payment and activation work?',
      a: 'The Pro plan is a 30-day (1 Month) subscription for ₹99 processed securely via our official ZapPay gateway (supporting all UPI apps, Google Pay, PhonePe, Paytm, Cards, and Net Banking). Once your payment is verified, your account instantly unlocks unlimited PDF operations and priority Gemini AI queries for 30 full days.',
    },
    {
      q: 'Are my PDF documents safe and private?',
      a: 'Yes. Core PDF operations (merging, splitting, compression, watermarking, conversions) execute directly in your browser using high-performance client libraries. Your raw documents are strictly isolated to your authenticated account and are never shared with other users or stored on public servers.',
    },
    {
      q: 'What is included in the Free tier?',
      a: `Free accounts receive ${limits.freePdfLimit} free PDF operations and ${limits.freeAiLimit} AI queries. You can explore all 7 PDF tools and all 4 AI tools at no cost before choosing to upgrade.`,
    },
    {
      q: 'Which AI model powers Omini PDF?',
      a: 'We use Google\'s state-of-the-art Gemini 3.8 Flash model, delivering rapid document synthesis, contextual understanding, and precise Q&A.',
    },
    {
      q: 'Can I split PDFs into individual pages or ranges?',
      a: 'Yes! The Split tool supports extracting exact page ranges (e.g. 1-3, 5) into a new PDF, or separating every single page and downloading them bundled into a ZIP file.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 bg-gradient-to-b from-rose-50/40 via-white to-white">
        <div className="absolute inset-0 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-xs font-bold uppercase tracking-wider mb-6 border border-rose-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Document Infrastructure &amp; AI Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Every PDF Tool You Need. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              Supercharged with Gemini AI.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Merge, split, compress, protect, and convert PDFs with sub-second speeds.
            Chat with documents, generate executive summaries, and extract key points using AI.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('tools-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore All 11 Tools</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {user?.plan !== 'pro' ? (
              <button
                onClick={onOpenUpgrade}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-900 bg-linear-to-r from-amber-400/90 to-amber-300 hover:brightness-105 border border-amber-300 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-900" />
                <span>Get Pro for ₹99</span>
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                <Crown className="w-4 h-4 fill-amber-700" />
                <span>Pro Member Active</span>
              </div>
            )}
          </div>

          {/* Social Proof Bar */}
          <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Strict Privacy &amp; AES-256</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Zero-Wait Instant Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Gemini 3.8 Flash Powered</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Powerful Document Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select any tool below to process your PDF or explore document intelligence.
            </p>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (11)
              </button>
              <button
                onClick={() => setSelectedCategory('pdf')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedCategory === 'pdf'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PDF Tools (7)
              </button>
              <button
                onClick={() => setSelectedCategory('ai')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedCategory === 'ai'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AI Suite (4)
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-xs rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-rose-400/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            >
              {tool.category === 'ai' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/10 to-purple-500/10 rounded-bl-full pointer-events-none"></div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      tool.category === 'ai'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {getToolIcon(tool.id)}
                  </div>

                  {tool.badge && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        tool.badge === 'AI'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : tool.badge === 'Popular'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tool.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-600 group-hover:translate-x-1 transition-transform">
                <span>Launch Tool</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pro Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-amber-950 inline-block mb-3">
              1-Month (30 Days) Access Pass
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Unlock Unlimited PDF Processing &amp; Gemini AI
            </h2>
            <p className="mt-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Pay ₹99 for a full 30-day Pro subscription. Enjoy unlimited document operations,
              high-speed batch downloads, and priority Gemini 3.8 Flash analysis.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenUpgrade}
                className="px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>Upgrade to Pro Now (₹99 / 30 Days)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Section */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Clear, Transparent Pricing
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Free Starter or Pro Monthly
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Start with our generous free plan, or get full unlimited access for a 30-day ₹99 subscription pass.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Free Tier */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Free Starter
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  Default
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">₹0</span>
                <span className="text-xs text-slate-400 font-medium">/ Standard</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ideal for quick, occasional document edits and testing our Gemini AI tools.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>3 PDF Operations</strong> (Merge, Split, Watermark, etc.)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>5 AI Document Queries</strong> (Summary, Chat, Key Points)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Standard Processing Speeds</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 25MB File Size</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) onOpenAuth('register');
                else {
                  const el = document.getElementById('tools-grid');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="mt-8 w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {user ? 'Explore Tools' : 'Create Free Account'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-rose-50/50 via-white to-white rounded-3xl p-8 border-2 border-rose-500 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-8 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-600 text-white shadow-md">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-4 h-4 fill-rose-600" />
                  Pro 30-Day Pass
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">₹99</span>
                <span className="text-sm text-slate-400 line-through">₹499</span>
                <span className="text-xs text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                  / 30 Days Access
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                1-Month subscription pass. Unlocks unlimited operations and priority AI queries for 30 full days.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Unlimited PDF Operations</strong> for 30 days
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Unlimited Gemini AI Queries</strong> &amp; Chat
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Priority Queue with Gemini 3.8 Flash</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Multi-file Batch Merging &amp; ZIP Archive Downloads</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>100MB File Size &amp; 24/7 Security</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenUpgrade}
              className="mt-8 w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:brightness-105 shadow-md shadow-rose-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Upgrade to Pro (₹99 / 30 Days)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faqs" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Got Questions?
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === idx ? 'rotate-180 text-rose-600' : 'text-slate-400'
                  }`}
                />
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-12 pb-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm">
              Omini<span className="text-rose-600">PDF</span>
            </span>
            <span className="text-slate-400">• All-In-One AI PDF SaaS Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span className="text-slate-500 font-medium">© 2026 Omini PDF. Built by Code Garage. Developed by SM Developer.</span>
            <button
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setActiveLegalModal('security')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Security Safeguards
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {activeLegalModal === 'privacy' && 'Privacy Policy'}
                {activeLegalModal === 'terms' && 'Terms of Service'}
                {activeLegalModal === 'security' && 'Security Safeguards'}
              </h3>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {activeLegalModal === 'privacy' && (
                <>
                  <p className="font-semibold text-slate-900">Last updated: October 2026</p>
                  <p>
                    Omini PDF ("we", "our", or "us"), operated by Code Garage and developed by SM Developer, respects your privacy and is committed to protecting your personal data.
                  </p>
                  <h4 className="font-bold text-slate-900 mt-3">1. Information We Collect</h4>
                  <p>
                    We collect account details (email and name) upon registration, transaction logs processed via ZapPay, and document metadata required to provide high-speed PDF processing and AI summarization.
                  </p>
                  <h4 className="font-bold text-slate-900 mt-3">2. Document Privacy & Zero-Retention</h4>
                  <p>
                    All PDF processing and Gemini AI analysis occur securely. Your uploaded documents are encrypted in transit and never stored permanently on our public servers without your authorization.
                  </p>
                  <h4 className="font-bold text-slate-900 mt-3">3. Contact Us</h4>
                  <p>For privacy inquiries, please contact our administrative support team at codegarage1@gmail.com.</p>
                </>
              )}

              {activeLegalModal === 'terms' && (
                <>
                  <p className="font-semibold text-slate-900">Effective Date: October 2026</p>
                  <p>
                    Welcome to Omini PDF. By accessing or using our platform built by Code Garage and developed by SM Developer, you agree to comply with and be bound by these Terms of Service.
                  </p>
                  <h4 className="font-bold text-slate-900 mt-3">1. Subscription & Pro Pass</h4>
                  <p>
                    The Pro plan is a 30-day access pass priced at ₹99, securely verified through official ZapPay payment gateways. Subscriptions unlock unlimited PDF operations and priority Gemini AI queries.
                  </p>
                  <h4 className="font-bold text-slate-900 mt-3">2. Acceptable Use</h4>
                  <p>
                    You agree not to upload malicious payloads, copyrighted intellectual property without authorization, or attempt to compromise platform security.
                  </p>
                </>
              )}

              {activeLegalModal === 'security' && (
                <>
                  <p className="font-semibold text-slate-900">Enterprise Security Infrastructure</p>
                  <p>
                    Omini PDF, engineered by Code Garage and SM Developer, enforces rigorous industry standards to guarantee the safety of your workflows:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>256-bit SSL/TLS encryption for all data in transit.</li>
                    <li>Secure token-based authentication with bcrypt hashing.</li>
                    <li>Stricter payment verification protocols via verified ZapPay gateway orders.</li>
                    <li>Client-side PDF rendering and manipulation via sandboxed WebAssembly engines.</li>
                  </ul>
                </>
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
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

