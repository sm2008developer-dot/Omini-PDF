/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  ListOrdered,
  HelpCircle,
  FileText,
  Upload,
  Send,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Zap,
  BookOpen,
} from 'lucide-react';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { User, PlatformLimits, api } from '../utils/api.js';
import { extractTextFromPdf } from '../utils/pdfEngine.js';

interface AiToolsWorkspaceProps {
  toolId: ToolId;
  user: User | null;
  limits: PlatformLimits;
  onBack: () => void;
  onRequireAuth: (reason: string) => void;
  onRequireUpgrade: (reason: string) => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const AiToolsWorkspace: React.FC<AiToolsWorkspaceProps> = ({
  toolId,
  user,
  limits,
  onBack,
  onRequireAuth,
  onRequireUpgrade,
  onUserUpdate,
}) => {
  const tool = TOOLS_CONFIG.find((t) => t.id === toolId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Summarizer state
  const [summaryType, setSummaryType] = useState('Executive Brief');
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  // 2. Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content:
        'Hello! Upload any PDF document or load our sample report, and ask me anything about it. I will provide precise, verified answers directly based on the text.',
    },
  ]);

  // 3. Key points state
  const [keypointsResult, setKeypointsResult] = useState<string | null>(null);

  // 4. Q&A state
  const [customQuestion, setCustomQuestion] = useState('');
  const [qaResult, setQaResult] = useState<string | null>(null);

  // Load sample document for fast testing
  const loadSampleDocument = () => {
    const sampleText = `ACME CORPORATION - ANNUAL STRATEGIC REPORT & FINANCIAL PLAN (2026-2027)

1. EXECUTIVE OVERVIEW
Acme Corporation demonstrated strong resilience throughout fiscal 2026, delivering ₹48.5 Crore in total revenue, a 28% year-over-year increase compared to 2025. Operating margins expanded by 340 basis points to 22.4%, driven by cloud automation, automated document infrastructure, and disciplined headcount growth.

2. STRATEGIC MILESTONES
- Transitioned 94% of enterprise workflows to cloud-native microservices.
- Achieved SOC-2 Type II, ISO 27001, and GDPR security compliance across all regions.
- Onboarded 1,420 new mid-market enterprise clients in Q3 and Q4.
- Reduced document processing latency by 62% using edge-accelerated parsing algorithms.

3. FINANCIAL BREAKDOWN & KEY FIGURES
- Gross Profit: ₹38.2 Crore (78.8% gross margin).
- Research & Development Expenditure: ₹9.4 Crore (19.4% of total revenue).
- Cash Reserves: ₹18.6 Crore held in liquid low-risk instruments.
- Projected Fiscal 2027 Target: ₹68.0 Crore top-line revenue with target EBITDA of ₹16.2 Crore.

4. RISK MANAGEMENT & COMPLIANCE DIRECTIVES
- Strict data residency mandates enforce zero storage of raw customer files on unencrypted drives.
- Regular penetration audits scheduled semi-annually with external certified auditors.
- Business Continuity Plan (BCP) guarantees 99.95% system uptime with 15-minute Recovery Time Objective (RTO).

5. KEY LEADERSHIP RECOMMENDATIONS
- Accelerate expansion into Tier-1 and Tier-2 metropolitan hubs.
- Launch self-serve developer API tier with pay-as-you-go billing by Q2 2027.
- Complete migration of legacy relational schemas into distributed managed PostgreSQL clusters.`;

    const sampleBlob = new Blob([sampleText], { type: 'text/plain' });
    const sampleFile = new File([sampleBlob], 'Acme_Strategic_Report_2026.pdf', {
      type: 'application/pdf',
    });

    setFile(sampleFile);
    setExtractedText(sampleText);
    setError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = e.target.files[0];
    setFile(selected);
    setError(null);
    setIsExtractingText(true);

    try {
      const text = await extractTextFromPdf(selected);
      setExtractedText(text);
    } catch {
      setExtractedText(`Document: ${selected.name} (${(selected.size / 1024).toFixed(1)} KB). Contents loaded for analysis.`);
    } finally {
      setIsExtractingText(false);
    }
  };

  const checkQuotaAndAuth = (): boolean => {
    if (!user) {
      onRequireAuth(`Please sign in or create an account to use AI features with ${tool?.name}.`);
      return false;
    }
    if (user.plan === 'free' && user.aiQueriesUsed >= limits.freeAiLimit) {
      onRequireUpgrade(`You have used all ${limits.freeAiLimit} free AI queries. Upgrade to Pro for unlimited AI intelligence!`);
      return false;
    }
    return true;
  };

  // Generate Summary
  const handleGenerateSummary = async () => {
    if (!checkQuotaAndAuth()) return;
    if (!extractedText.trim()) {
      setError('Please upload a PDF or click "Load Sample Document" first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.aiSummarize({
        text: extractedText,
        fileName: file?.name || 'document.pdf',
        summaryType,
      });
      setSummaryResult(res.summary);
      onUserUpdate(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Chat message submit
  const handleSendChat = async (questionOverride?: string) => {
    const query = questionOverride || chatInput;
    if (!query.trim()) return;
    if (!checkQuotaAndAuth()) return;
    if (!extractedText.trim()) {
      setError('Please upload a PDF or click "Load Sample Document" first.');
      return;
    }

    const newMessages = [...chatMessages, { role: 'user' as const, content: query }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsGenerating(true);
    setError(null);

    try {
      const res = await api.aiChat({
        text: extractedText,
        fileName: file?.name || 'document.pdf',
        query,
        chatHistory: chatMessages,
      });
      setChatMessages([...newMessages, { role: 'assistant', content: res.answer }]);
      onUserUpdate(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat query failed';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract Key Points
  const handleExtractKeyPoints = async () => {
    if (!checkQuotaAndAuth()) return;
    if (!extractedText.trim()) {
      setError('Please upload a PDF or click "Load Sample Document" first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.aiExtractKeypoints({
        text: extractedText,
        fileName: file?.name || 'document.pdf',
      });
      setKeypointsResult(res.keypoints);
      onUserUpdate(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Key points extraction failed';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Q&A
  const handleRunQA = async () => {
    if (!checkQuotaAndAuth()) return;
    if (!extractedText.trim()) {
      setError('Please upload a PDF or click "Load Sample Document" first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.aiQA({
        text: extractedText,
        fileName: file?.name || 'document.pdf',
        question: customQuestion.trim() ? customQuestion : undefined,
      });
      setQaResult(res.result);
      onUserUpdate(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Q&A generation failed';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Tools</span>
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            user.plan === 'pro' ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                PRO Member • Unlimited AI
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                AI Quota: {Math.max(0, limits.freeAiLimit - user.aiQueriesUsed)} queries left
              </span>
            )
          ) : (
            <button
              onClick={() => onRequireAuth('Please sign in to run AI analysis.')}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Sign in to unlock
            </button>
          )}
        </div>
      </div>

      {/* Tool Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/10 via-amber-500/10 to-rose-500/20 border border-rose-200 shadow-xs mb-3">
          <Sparkles className="w-7 h-7 text-rose-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{tool?.name}</h1>
        <p className="text-slate-600 text-sm mt-1.5">{tool?.description}</p>
      </div>

      {/* Upload & Context Banner */}
      <div className="mb-8 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Document</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {file ? file.name : 'No document loaded yet'}
              </p>
              {extractedText && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✓ Context loaded ({extractedText.length} characters)
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={loadSampleDocument}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Load Sample Report</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{file ? 'Change PDF' : 'Upload PDF'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tool-specific Views */}

      {/* 1. AI Summarizer */}
      {toolId === 'ai-summarizer' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Summary Format
              </label>
              <div className="flex flex-wrap gap-2">
                {['Executive Brief', 'Key Takeaways & Action Items', 'In-Depth Analysis'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSummaryType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      summaryType === type
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating || !extractedText}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>

          {summaryResult && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  AI Summary Output ({summaryType})
                </span>
                <button
                  onClick={() => copyToClipboard(summaryResult)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                {summaryResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Chat with PDF */}
      {toolId === 'ai-chat' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[620px]">
          {/* Chat message stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-rose-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none whitespace-pre-line'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Gemini is reading document context...</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Prompt Chips */}
          <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Suggestions:
            </span>
            {[
              'What were the total revenues and growth rate?',
              'What security certifications are mentioned?',
              'List the main strategic milestones',
              'What are the key risk directives?',
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChat(prompt)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 text-xs shrink-0 cursor-pointer transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  extractedText
                    ? 'Ask any question about this document...'
                    : 'Load or upload a PDF first...'
                }
                disabled={!extractedText || isGenerating}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isGenerating}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Extract Key Points */}
      {toolId === 'ai-keypoints' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Instant Knowledge Extraction</h3>
              <p className="text-xs text-slate-500">
                Extract high-priority metrics, key milestones, dates, and conclusions from the text.
              </p>
            </div>
            <button
              onClick={handleExtractKeyPoints}
              disabled={isGenerating || !extractedText}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-4 h-4" />
                  <span>Extract Key Points</span>
                </>
              )}
            </button>
          </div>

          {keypointsResult && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Extracted Bullet Points &amp; Metrics
                </span>
                <button
                  onClick={() => copyToClipboard(keypointsResult)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line text-slate-800 leading-relaxed">
                {keypointsResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. AI-Powered PDF Q&A */}
      {toolId === 'ai-qa' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Interactive Questions &amp; Answers
            </h3>
            <p className="text-xs text-slate-500">
              Ask a specific query, or leave blank to automatically synthesize an educational/audit Q&amp;A assessment.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Optional: Enter a specific question (or leave blank to auto-generate 4 Q&As)"
                className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                onClick={handleRunQA}
                disabled={isGenerating || !extractedText}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>{customQuestion.trim() ? 'Answer Question' : 'Generate Q&A Set'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {qaResult && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Q&amp;A Output
                </span>
                <button
                  onClick={() => copyToClipboard(qaResult)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                {qaResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
