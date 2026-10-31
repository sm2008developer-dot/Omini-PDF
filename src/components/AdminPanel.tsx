/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CreditCard,
  Settings,
  TrendingUp,
  FileText,
  Sparkles,
  Crown,
  Search,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sliders,
  DollarSign,
  AlertTriangle,
  Trash2,
  Tag,
  Plus,
  Clock,
  Shield,
  Activity,
  Megaphone,
  UserCheck,
  UserX,
  ExternalLink,
  Edit2,
  Eye,
  EyeOff,
  Cpu,
  X,
  Zap,
} from 'lucide-react';
import { User, Transaction, DocumentHistory, api } from '../utils/api.js';
import { formatINR, formatFileSize } from '../utils/pdfLimits.js';

interface AdminPanelProps {
  currentUser: User;
  onBackToHome: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onBackToHome }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'transactions' | 'vouchers' | 'audit' | 'settings'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats & Core Data
  const [stats, setStats] = useState<{
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    totalRevenue: number;
    totalPdfOps: number;
    totalAiQueries: number;
    transactionsCount: number;
    recentTransactions: Transaction[];
  } | null>(null);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userFilterPlan, setUserFilterPlan] = useState<'all' | 'pro' | 'free' | 'admin'>('all');

  // Transactions & Audit
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [auditDocs, setAuditDocs] = useState<DocumentHistory[]>([]);
  const [searchDocQuery, setSearchDocQuery] = useState('');

  // Vouchers
  const [vouchersList, setVouchersList] = useState<
    Array<{
      id: string;
      code: string;
      discountPercent: number;
      maxUses: number;
      currentUses: number;
      active: boolean;
      createdAt: string;
    }>
  >([]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(100);
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(500);

  // Edit Voucher Modal State
  const [editingVoucher, setEditingVoucher] = useState<{
    id: string;
    code: string;
    discountPercent: number;
    maxUses: number;
    active: boolean;
  } | null>(null);

  // Manual Grant Pro Form
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [grantMsg, setGrantMsg] = useState<string | null>(null);

  // Platform & AI Settings (FreeModel 1 Million Token API)
  const [settings, setSettings] = useState({
    freePdfLimit: 3,
    freeAiLimit: 5,
    proPriceINR: 99,
    subscriptionDays: 30,
    geminiModel: 'gpt-4o-mini',
    aiApiBaseUrl: 'https://freemodel.in/v1',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    maintenanceMode: false,
    zapPayLinkId: 'f66a2d52',
    announcementText: '⚡ Special Offer: Unlock 30 Days of Unlimited AI PDF Tools for just ₹99 via ZapPay UPI!',
    announcementActive: true,
  });
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [customModelInput, setCustomModelInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string; reply?: string } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, usersRes, settingsRes, vouchersRes, docsRes, aiModelsRes] = await Promise.all([
        api.adminGetStats(),
        api.adminGetUsers(),
        api.adminGetSettings(),
        api.adminGetVouchers(),
        api.adminGetDocuments(),
        api.adminGetAiModels().catch(() => ({ models: [], activeModel: 'gpt-4o-mini', isLive: false })),
      ]);
      setStats(statsRes);
      setUsersList(usersRes.users);
      const s = settingsRes.settings as any;
      setSettings({
        freePdfLimit: s.freePdfLimit ?? 3,
        freeAiLimit: s.freeAiLimit ?? 5,
        proPriceINR: s.proPriceINR ?? 99,
        subscriptionDays: s.subscriptionDays ?? 30,
        geminiModel: s.aiModel || s.geminiModel || 'gpt-4o-mini',
        aiApiBaseUrl: s.aiApiBaseUrl || 'https://freemodel.in/v1',
        aiApiKey: s.aiApiKey || '',
        aiModel: s.aiModel || s.geminiModel || 'gpt-4o-mini',
        maintenanceMode: !!s.maintenanceMode,
        zapPayLinkId: s.zapPayLinkId || 'f66a2d52',
        announcementText: s.announcementText || '⚡ Special Offer: Unlock 30 Days of Unlimited AI PDF Tools for just ₹99 via ZapPay UPI!',
        announcementActive: s.announcementActive ?? true,
      });
      if (aiModelsRes && aiModelsRes.models) {
        setAvailableModels(aiModelsRes.models);
      }
      setVouchersList(vouchersRes.vouchers || []);
      setAuditDocs(docsRes.documents || []);
      setTransactionsList(statsRes.recentTransactions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load administrator data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (user: User) => {
    const nextPlan = user.plan === 'pro' ? 'free' : 'pro';
    try {
      const res = await api.adminUpdateUser(user.id, { plan: nextPlan });
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      const newStats = await api.adminGetStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to toggle plan:', err);
    }
  };

  const handleGrantProDays = async (userId: string, days = 30) => {
    try {
      const res = await api.adminGrantPro(userId, days);
      if (res.success) {
        setUsersList((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
        setGrantMsg(`Successfully granted ${days} days of Pro access!`);
        setTimeout(() => setGrantMsg(null), 3000);
        const newStats = await api.adminGetStats();
        setStats(newStats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to grant Pro days';
      setError(msg);
    }
  };

  const handleManualGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    try {
      const res = await api.adminGrantPro({ email: grantEmail.trim(), days: grantDays });
      if (res.success) {
        setUsersList((prev) => {
          const exists = prev.some((u) => u.id === res.user.id);
          if (exists) {
            return prev.map((u) => (u.id === res.user.id ? res.user : u));
          }
          return [res.user, ...prev];
        });
        setGrantMsg(`Successfully granted ${grantDays} days of Pro access to ${grantEmail}!`);
        setTimeout(() => setGrantMsg(null), 3500);
        setGrantEmail('');
        const newStats = await api.adminGetStats();
        setStats(newStats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to grant Pro';
      setError(msg);
    }
  };

  const handleResetUserQuota = async (user: User) => {
    try {
      const res = await api.adminUpdateUser(user.id, {
        pdfOperationsUsed: 0,
        aiQueriesUsed: 0,
      });
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
    } catch (err) {
      console.error('Failed to reset quota:', err);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${email}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.adminDeleteUser(userId);
      if (res.success) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
        const newStats = await api.adminGetStats();
        setStats(newStats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setError(msg);
    }
  };

  const handleToggleVoucher = async (vId: string, currentActive: boolean) => {
    try {
      const res = await api.adminUpdateVoucher(vId, { active: !currentActive });
      setVouchersList((prev) => prev.map((v) => (v.id === vId ? res.voucher : v)));
    } catch (err) {
      console.error('Failed to toggle voucher:', err);
    }
  };

  const handleDeleteVoucher = async (vId: string, vCode: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon voucher "${vCode}"? Users will no longer be able to use or redeem it.`)) {
      return;
    }
    try {
      await api.adminDeleteVoucher(vId);
      setVouchersList((prev) => prev.filter((v) => v.id !== vId));
    } catch (err) {
      console.error('Failed to delete voucher:', err);
    }
  };

  const handleUpdateVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;
    try {
      const res = await api.adminUpdateVoucher(editingVoucher.id, {
        code: editingVoucher.code.trim().toUpperCase(),
        discountPercent: Number(editingVoucher.discountPercent),
        maxUses: Number(editingVoucher.maxUses),
        active: editingVoucher.active,
      });
      setVouchersList((prev) => prev.map((v) => (v.id === editingVoucher.id ? res.voucher : v)));
      setEditingVoucher(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update voucher';
      setError(msg);
    }
  };

  const handleTestAi = async () => {
    try {
      setAiTesting(true);
      setAiTestResult(null);
      const res = await api.adminTestAi({
        apiKey: settings.aiApiKey,
        apiBaseUrl: settings.aiApiBaseUrl,
        model: settings.aiModel,
      });
      setAiTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'FreeModel test request failed';
      setAiTestResult({ success: false, message: msg });
    } finally {
      setAiTesting(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode.trim()) return;
    try {
      const res = await api.adminCreateVoucher({
        code: newVoucherCode.trim().toUpperCase(),
        discountPercent: Number(newVoucherDiscount),
        maxUses: Number(newVoucherMaxUses),
        active: true,
      });
      setVouchersList((prev) => [res.voucher, ...prev]);
      setNewVoucherCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create voucher';
      setError(msg);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.adminUpdateSettings(settings);
      setSettingsSavedMsg(true);
      setTimeout(() => setSettingsSavedMsg(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilterPlan === 'pro') return u.plan === 'pro';
    if (userFilterPlan === 'free') return u.plan === 'free';
    if (userFilterPlan === 'admin') return u.role === 'admin';
    return true;
  });

  // Filtered Audit Documents
  const filteredDocs = auditDocs.filter(
    (d) =>
      d.fileName.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      d.toolName.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      d.resultSummary.toLowerCase().includes(searchDocQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Command Center</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Primary Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage platform metrics, users, ZapPay subscriptions, vouchers, audit logs &amp; policies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={loadAdminData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={onBackToHome}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Back to App
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {grantMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{grantMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Platform Analytics', icon: TrendingUp },
          { id: 'users', label: `Users (${usersList.length})`, icon: Users },
          { id: 'transactions', label: 'ZapPay Ledger (₹99)', icon: CreditCard },
          { id: 'vouchers', label: `Vouchers (${vouchersList.length})`, icon: Tag },
          { id: 'audit', label: `Activity Audit (${auditDocs.length})`, icon: Activity },
          { id: 'settings', label: 'Platform & Gateway', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Platform Analytics */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top 4 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalUsers}</p>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  {stats.proUsers} Pro ({Math.round((stats.proUsers / Math.max(1, stats.totalUsers)) * 100)}%)
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
                <p className="text-3xl font-black text-emerald-600 mt-1">{formatINR(stats.totalRevenue)}</p>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  {stats.transactionsCount} Verified Transactions
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PDF Operations</span>
                <p className="text-3xl font-black text-rose-600 mt-1">{stats.totalPdfOps}</p>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Merge, Split, Protect &amp; Compress
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Queries</span>
                <p className="text-3xl font-black text-purple-600 mt-1">{stats.totalAiQueries}</p>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Gemini 3.8 Flash Engine
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Manual Pro Grant Box */}
          <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-[11px] font-bold uppercase">
                <Crown className="w-3.5 h-3.5" />
                <span>Customer Support Quick Grant</span>
              </div>
              <h3 className="text-xl font-bold">Manually Activate Pro for Any User</h3>
              <p className="text-xs text-slate-300 max-w-md">
                Easily grant a 30-Day, 90-Day, or 1-Year subscription pass to a user who paid via offline UPI or requires support.
              </p>
            </div>

            <form onSubmit={handleManualGrantSubmit} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="email"
                required
                placeholder="User Email Address"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-purple-400 outline-hidden flex-1 sm:w-64"
              />
              <select
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:ring-2 focus:ring-purple-400 outline-hidden"
              >
                <option value={30} className="text-slate-900">30 Days (1 Month)</option>
                <option value={90} className="text-slate-900">90 Days (3 Months)</option>
                <option value={365} className="text-slate-900">365 Days (1 Year)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Grant Pass
              </button>
            </form>
          </div>

          {/* Gateway Status & Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">ZapPay Payment Gateway Health</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Operational
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official gateway link active with merchant ID <code>f66a2d52</code>. Real-time verification checks API connectivity with <code>zappay-beta.vercel.app</code>.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Default Price:</span>
                <span className="font-bold text-slate-900">₹{settings.proPriceINR} / 30 Days</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">Gemini AI Model Status</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connected to Google Gemini API (<code>{settings.geminiModel}</code>). Handling PDF summaries, document analysis, Q&amp;A generation, and interactive chat.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Free AI Quota:</span>
                <span className="font-bold text-slate-900">{settings.freeAiLimit} Queries / User</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Directory & Access Management */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'pro', 'free', 'admin'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setUserFilterPlan(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    userFilterPlan === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Plan &amp; Duration</th>
                    <th className="py-3 px-4">Subscription Expiry</th>
                    <th className="py-3 px-4">PDF Ops</th>
                    <th className="py-3 px-4">AI Queries</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isPrimaryAdmin = u.email.toLowerCase() === 'codegarage1@gmail.com';
                    const expiryDate = u.proExpiresAt ? new Date(u.proExpiresAt) : null;
                    const isExpired = expiryDate ? expiryDate.getTime() <= Date.now() : false;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              u.plan === 'pro'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.plan === 'pro' ? 'Pro (30 Days)' : 'Free Tier'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {expiryDate ? (
                            <span className={isExpired ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                              {expiryDate.toLocaleDateString()} {isExpired ? '(Expired)' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A (Free)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">{u.pdfOperationsUsed}</td>
                        <td className="py-3.5 px-4 font-mono">{u.aiQueriesUsed}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleGrantProDays(u.id, 30)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                              title="Grant +30 Days of Pro"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => handleTogglePlan(u)}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold cursor-pointer"
                            >
                              {u.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                            </button>
                            <button
                              onClick={() => handleResetUserQuota(u)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Reset usage limits"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {!isPrimaryAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-rose-400 hover:text-rose-600 cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: ZapPay Transactions & Ledger */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-1">ZapPay Payment &amp; Subscription Ledger</h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time records of all completed and verified subscriptions processed via ZapPay and promotional vouchers.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order / Payment ID</th>
                    <th className="py-3 px-4">User Email</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method / Reference</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactionsList.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{tx.paymentId}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{tx.userEmail}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {tx.amount === 0 ? 'FREE' : formatINR(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] max-w-[200px] truncate">{tx.paymentMethod}</td>
                      <td className="py-3.5 px-4 font-medium">{tx.durationDays || 30} Days</td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Promotional Vouchers */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Create Voucher Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Create Promotional Voucher</h3>
            <p className="text-xs text-slate-500 mb-4">
              Issue voucher codes for marketing campaigns, demo testers, or special discount discounts.
            </p>

            <form onSubmit={handleCreateVoucher} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE2026"
                  value={newVoucherCode}
                  onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newVoucherDiscount}
                  onChange={(e) => setNewVoucherDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Redemptions</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={newVoucherMaxUses}
                  onChange={(e) => setNewVoucherMaxUses(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Voucher</span>
              </button>
            </form>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Usage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchersList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{v.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600">{v.discountPercent}% OFF</td>
                      <td className="py-3.5 px-4 font-mono">
                        {v.currentUses} / {v.maxUses}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {v.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingVoucher({
                                id: v.id,
                                code: v.code,
                                discountPercent: v.discountPercent,
                                maxUses: v.maxUses,
                                active: v.active,
                              })
                            }
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer transition-colors"
                            title="Edit Voucher (Code, Discount %, Limits)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleVoucher(v.id, v.active)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            {v.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(v.id, v.code)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                            title="Delete Voucher Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Voucher Modal Dialog */}
          {editingVoucher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Edit Coupon Voucher</h3>
                    <p className="text-[11px] text-slate-500">Update code, discount % or usage limits</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateVoucherSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Code</label>
                    <input
                      type="text"
                      required
                      value={editingVoucher.code}
                      onChange={(e) => setEditingVoucher({ ...editingVoucher, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono uppercase bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Discount %</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={editingVoucher.discountPercent}
                        onChange={(e) =>
                          setEditingVoucher({ ...editingVoucher, discountPercent: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                      <span className="text-[10px] text-slate-400">100 = 100% Free Pass</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Max Redemptions</label>
                      <input
                        type="number"
                        min={1}
                        max={50000}
                        required
                        value={editingVoucher.maxUses}
                        onChange={(e) => setEditingVoucher({ ...editingVoucher, maxUses: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Voucher Active Status</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingVoucher.active}
                        onChange={(e) => setEditingVoucher({ ...editingVoucher, active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingVoucher(null)}
                      className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Document Activity Audit Stream */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search audit events by file name or tool..."
                value={searchDocQuery}
                onChange={(e) => setSearchDocQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total logged: {filteredDocs.length}</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tool Name</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">Result Summary</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{doc.toolName}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 truncate max-w-[180px]">{doc.fileName}</td>
                      <td className="py-3 px-4 text-slate-500">{formatFileSize(doc.fileSize)}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[240px]">{doc.resultSummary}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {new Date(doc.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Platform & Gateway Configuration */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-3xl space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-slate-900">Platform Policies &amp; Gateway Configuration</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure free quotas, ZapPay gateway credentials, pricing pass duration, announcement broadcasts, and AI models.
            </p>
          </div>

          {settingsSavedMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved and applied in real time across the platform!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Announcement Banner Controls */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">Global Announcement Broadcast</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcementActive}
                    onChange={(e) => setSettings({ ...settings, announcementActive: e.target.checked })}
                    className="rounded-sm text-purple-600"
                  />
                  <span>Active</span>
                </label>
              </div>

              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                placeholder="Announcement banner text..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Quota & Pricing Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Free PDF Operations Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.freePdfLimit}
                  onChange={(e) => setSettings({ ...settings, freePdfLimit: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Free AI Queries Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.freeAiLimit}
                  onChange={(e) => setSettings({ ...settings, freeAiLimit: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pro Price (INR ₹)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.proPriceINR}
                  onChange={(e) => setSettings({ ...settings, proPriceINR: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subscription Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.subscriptionDays}
                  onChange={(e) => setSettings({ ...settings, subscriptionDays: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* ZapPay Gateway Link ID */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <label className="block text-xs font-bold text-indigo-950">ZapPay Payment Link ID</label>
              <input
                type="text"
                value={settings.zapPayLinkId}
                onChange={(e) => setSettings({ ...settings, zapPayLinkId: e.target.value })}
                placeholder="e.g. f66a2d52"
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-white font-mono"
              />
              <p className="text-[11px] text-indigo-700">
                Direct URL: <code>https://panel.zappay.shop/pay.html?id={settings.zapPayLinkId}</code>
              </p>
            </div>

            {/* FreeModel AI Engine (1 Million Free Tokens API) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 border-2 border-purple-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>FreeModel AI Engine</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        1 Million Free Tokens
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      High-speed OpenAI-compatible API gateway (GPT-4o Mini, DeepSeek, Gemini, Claude, Llama)
                    </p>
                  </div>
                </div>
                <a
                  href="https://freemodel.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-purple-700 hover:underline flex items-center gap-1"
                >
                  <span>freemodel.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* API Base URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Endpoint Base URL
                </label>
                <input
                  type="text"
                  value={settings.aiApiBaseUrl}
                  onChange={(e) => setSettings({ ...settings, aiApiBaseUrl: e.target.value })}
                  placeholder="https://freemodel.in/v1"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* FreeModel API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    FreeModel API Key
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {settings.aiApiKey ? 'Key Configured' : 'No Key Set (Using Local Synthesis Engine)'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.aiApiKey}
                    onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
                    placeholder="Paste your FreeModel API key here (e.g. fm-...)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-white pr-10 focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Sign up on <a href="https://freemodel.in" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-medium">freemodel.in</a> to claim 1,000,000 free tokens. Paste your API key here.
                </p>
              </div>

              {/* Model Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select AI Model
                  </label>
                  <select
                    value={settings.aiModel}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Default • Ultra Fast &amp; Free)</option>
                    <option value="gpt-4o">gpt-4o (OpenAI Flagship)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Google High Speed)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Google Flash)</option>
                    <option value="deepseek-chat">deepseek-chat (DeepSeek V3 / R1)</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet (Anthropic)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct (Meta)</option>
                    <option value="qwen/qwen-2.5-72b-instruct">qwen/qwen-2.5-72b-instruct (Alibaba)</option>
                    {availableModels
                      .filter(
                        (m) =>
                          ![
                            'gpt-4o-mini',
                            'gpt-4o',
                            'gemini-2.5-flash',
                            'gemini-2.0-flash',
                            'deepseek-chat',
                            'claude-3-5-sonnet',
                            'meta-llama/llama-3.3-70b-instruct',
                            'qwen/qwen-2.5-72b-instruct',
                          ].includes(m.id)
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id} ({m.provider})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Or Type Custom Model ID
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. custom-model-id"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono"
                    />
                    <button
                      type="button"
                      disabled={!customModelInput.trim()}
                      onClick={() => {
                        if (customModelInput.trim()) {
                          setSettings({ ...settings, aiModel: customModelInput.trim() });
                          setCustomModelInput('');
                        }
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Use
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Model Indicator & Test Button */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-purple-100">
                <div className="text-xs">
                  <span className="text-slate-500">Active Model: </span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                    {settings.aiModel || 'gpt-4o-mini'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={aiTesting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {aiTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing Endpoint...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Test FreeModel Connection</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Test Result Banner */}
              {aiTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                    aiTestResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {aiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{aiTestResult.message}</p>
                    {aiTestResult.reply && (
                      <p className="mt-1 font-mono text-[11px] bg-white/70 p-1.5 rounded-md border border-emerald-200">
                        Response: "{aiTestResult.reply}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Maintenance Mode */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Platform Maintenance Mode</h4>
                <p className="text-[11px] text-slate-500">Temporarily disables file processing for non-admin users.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-5 h-5 rounded-md text-purple-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="py-3 px-6 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving Policies...' : 'Save & Broadcast Changes'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
