/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Crown,
  FileText,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  Calendar,
  Shield,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { User, PlatformLimits, DocumentHistory, api } from '../utils/api.js';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { getRemainingSubscriptionDays } from '../utils/pdfLimits.js';

interface UserDashboardProps {
  user: User;
  limits: PlatformLimits;
  onOpenUpgrade: () => void;
  onSelectTool: (toolId: ToolId) => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  limits,
  onOpenUpgrade,
  onSelectTool,
  onUserUpdate,
}) => {
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(user.name);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getHistory();
      setHistory(res.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameVal.trim()) return;
    try {
      const res = await api.updateProfile(editNameVal);
      onUserUpdate(res.user);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      const res = await api.resetDemoUsage();
      onUserUpdate(res.user);
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setResetting(false);
    }
  };

  const filteredHistory = history.filter(
    (h) =>
      h.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.toolName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pdfPercent =
    user.plan === 'pro'
      ? 100
      : Math.min(100, Math.round((user.pdfOperationsUsed / limits.freePdfLimit) * 100));

  const aiPercent =
    user.plan === 'pro'
      ? 100
      : Math.min(100, Math.round((user.aiQueriesUsed / limits.freeAiLimit) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black text-white shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editNameVal}
                      onChange={(e) => setEditNameVal(e.target.value)}
                      className="px-2 py-1 text-sm bg-white/20 rounded-lg text-white border border-white/30 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs bg-rose-600 rounded-lg font-bold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h1 className="text-2xl font-black tracking-tight">{user.name}</h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-rose-300 hover:text-white underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </>
                )}
                {user.plan === 'pro' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs">
                    <Crown className="w-3.5 h-3.5 fill-amber-950" />
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">{user.email}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Account Secured
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user.plan === 'free' ? (
              <button
                onClick={onOpenUpgrade}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-105 shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Upgrade to Pro (₹99 / 30 Days)</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4 fill-amber-300" />
                <span>
                  Pro 30-Day Plan ({getRemainingSubscriptionDays(user.proExpiresAt) > 0 ? `${getRemainingSubscriptionDays(user.proExpiresAt)} days left` : 'Active'})
                </span>
              </div>
            )}

            {user.plan === 'free' && (
              <button
                onClick={handleResetDemo}
                disabled={resetting}
                title="Reset free counters for demo tutorial"
                className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Reset Quota</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quota & Usage Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Operations Quota */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PDF Operations
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-slate-900">
              {user.plan === 'pro' ? 'Unlimited' : `${user.pdfOperationsUsed} / ${limits.freePdfLimit}`}
            </span>
            <span className="text-xs text-slate-500">
              {user.plan === 'pro'
                ? '∞ remaining'
                : `${Math.max(0, limits.freePdfLimit - user.pdfOperationsUsed)} free remaining`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                user.plan === 'pro'
                  ? 'bg-amber-500'
                  : pdfPercent >= 100
                  ? 'bg-rose-600'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${user.plan === 'pro' ? 100 : pdfPercent}%` }}
            ></div>
          </div>
        </div>

        {/* AI Queries Quota */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              AI Document Queries
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-slate-900">
              {user.plan === 'pro' ? 'Unlimited' : `${user.aiQueriesUsed} / ${limits.freeAiLimit}`}
            </span>
            <span className="text-xs text-slate-500">
              {user.plan === 'pro'
                ? '∞ remaining'
                : `${Math.max(0, limits.freeAiLimit - user.aiQueriesUsed)} queries left`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                user.plan === 'pro'
                  ? 'bg-purple-500'
                  : aiPercent >= 100
                  ? 'bg-rose-600'
                  : 'bg-purple-600'
              }`}
              style={{ width: `${user.plan === 'pro' ? 100 : aiPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Plan Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Membership Tier
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  user.plan === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {user.plan === 'pro' ? 'Pro (30 Days)' : 'Free Plan'}
              </span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {user.plan === 'pro' ? 'Pro 30-Day Subscription' : 'Free Starter Tier'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {user.plan === 'pro'
                ? user.proExpiresAt
                  ? `Unlimited operations active until ${new Date(user.proExpiresAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}.`
                  : 'High-speed processing, Gemini 3.8 Flash priority & unlimited operations.'
                : 'Limited to 3 PDF operations and 5 AI queries.'}
            </p>
          </div>

          {user.plan === 'free' ? (
            <button
              onClick={onOpenUpgrade}
              className="mt-4 text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Unlock 30 Days Unlimited for ₹99</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="mt-4 flex items-center justify-between text-xs text-amber-900 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
              <span className="font-semibold">
                Status: {user.subscriptionStatus === 'expired' ? 'Expired' : 'Active (Auto-downgrade protected)'}
              </span>
              <button
                onClick={onOpenUpgrade}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Extend (+30d)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Launch Tools Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Quick Launch Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {TOOLS_CONFIG.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 text-center transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-white shadow-2xs mx-auto flex items-center justify-center text-slate-700 group-hover:text-rose-600 mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <span className="block text-xs font-bold text-slate-800 truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Document Processing History */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Document Processing History</h2>
            <p className="text-xs text-slate-500">
              Audit log of your recent operations, file conversions, and AI queries.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by file or tool..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No operations found</p>
            <p className="text-xs text-slate-400 mt-1">
              Select any tool from the navigation to process your first document.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Tool Used</th>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Result Summary</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>{item.toolName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 truncate max-w-[200px]">
                      {item.fileName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {item.fileSize > 0 ? `${(item.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[240px]">
                      {item.resultSummary}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(item.timestamp).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
