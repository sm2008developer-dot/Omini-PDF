/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  Calendar,
  Shield,
  Search,
  Infinity as InfinityIcon,
  History as HistoryIcon,
  Trash2,
  Eye,
  Download,
  LogIn,
  ArrowRight,
} from 'lucide-react';
import { User, PlatformLimits, api } from '../utils/api.js';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { AdsterraAdBanner } from './AdsterraAdBanner.js';
import { ADSTERRA_BANNERS } from '../utils/adsterra.js';
import {
  LocalHistoryEntry,
  getLocalHistory,
  mergeHistoryLists,
  filterHistoryItems,
  deleteLocalHistoryItem,
  clearLocalHistory,
  getSessionHistoryFile,
  hydrateHistoryBlobs,
} from '../utils/historyStore.js';
import { PdfPreviewModal } from './PdfPreviewModal.js';
import { MonetagDownloadLink } from './MonetagDownloadLink.js';

interface UserDashboardProps {
  user: User | null;
  limits: PlatformLimits;
  onSelectTool: (toolId: ToolId) => void;
  onUserUpdate: (updatedUser: User) => void;
  onOpenAuth?: (mode?: 'login' | 'register', reason?: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onSelectTool,
  onUserUpdate,
  onOpenAuth,
}) => {
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(user?.name || '');
  const [confirmClear, setConfirmClear] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<{
    file?: File | Blob | null;
    name: string;
    downloadUrl?: string;
  } | null>(null);

  useEffect(() => {
    setEditNameVal(user?.name || '');
  }, [user?.name]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const localDocs = getLocalHistory();

    if (!user?.id) {
      await hydrateHistoryBlobs(localDocs);
      setHistory(localDocs);
      setLoading(false);
      return;
    }

    try {
      const { getUserHistoryFromFirestore } = await import('../lib/firebaseService.js');
      const [firestoreDocs, apiRes] = await Promise.all([
        getUserHistoryFromFirestore(user.id).catch(() => []),
        api.getHistory().catch(() => ({ history: [] })),
      ]);

      const firestoreSafeArray = Array.isArray(firestoreDocs) ? firestoreDocs : [];
      const combinedCloud = [...firestoreSafeArray, ...(apiRes?.history || [])];
      const merged = mergeHistoryLists(localDocs, combinedCloud);
      await hydrateHistoryBlobs(merged);
      setHistory(merged);
    } catch (err) {
      console.warn('History load notice:', err);
      await hydrateHistoryBlobs(localDocs);
      setHistory(localDocs);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameVal.trim() || !user) return;
    try {
      const res = await api.updateProfile(editNameVal);
      onUserUpdate(res.user);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  const handleDeleteEntry = (id: string) => {
    deleteLocalHistoryItem(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    clearLocalHistory();
    setConfirmClear(false);
    loadHistory();
  };

  const filteredHistory = filterHistoryItems(history, searchQuery, toolFilter);
  const hasLocalItems = history.some((item) => item.source !== 'cloud');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Banner: Signed-in Profile OR Guest History Banner */}
      {user ? (
        <div className="bg-gradient-to-r from-[#16000D] via-[#35001F] to-[#16000D] border border-[#452035] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#35001F] border border-[#FF1493]/50 flex items-center justify-center text-2xl font-black text-white shadow-inner shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        className="px-2 py-1 text-sm bg-[#12000A] rounded-lg text-white border border-[#452035] focus:outline-hidden focus:border-[#FF1493]"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 text-xs bg-[#E90083] hover:bg-[#FF1493] rounded-lg font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="text-xs text-[#C8B8C4] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">{user.name}</h1>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="text-xs text-[#FF4DB8] hover:text-white underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1FA971] text-white shadow-xs">
                    100% Free Unlimited
                  </span>
                </div>
                <p className="text-xs text-[#C8B8C4] mt-1 truncate">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#91808C]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-[#C8B8C4]">
                    <Shield className="w-3.5 h-3.5 text-[#1FA971]" />
                    Saved to Your Account ({user.email})
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-[#0B0007] border border-[#452035] text-[#C8B8C4] text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto">
              <InfinityIcon className="w-4 h-4 text-[#FF1493] shrink-0" />
              <span>Account History Active • 100% Free</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#16000D] via-[#35001F] to-[#16000D] border border-[#452035] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#35001F] border border-[#FF1493]/40 flex items-center justify-center shrink-0">
                <HistoryIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF4DB8]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">PDF Processing History</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1FA971] text-white">
                    Saved in Local Storage
                  </span>
                </div>
                <p className="text-xs text-[#C8B8C4] mt-1 max-w-xl leading-relaxed">
                  <strong className="text-white">Login is optional:</strong> Without signing in, your PDF history saves automatically in your{' '}
                  <strong className="text-white">Browser Local Storage</strong>. If you sign in, your history saves to your{' '}
                  <strong className="text-white">Account</strong>.
                </p>
              </div>
            </div>

            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth('login', 'Optional: Sign in to save your PDF processing history to your Account.')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] shadow-md shadow-[#E90083]/25 transition-all cursor-pointer shrink-0 self-start md:self-auto"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Save to Account</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Processing History Card */}
      <div className="bg-[#16000D] rounded-3xl p-4 sm:p-6 border border-[#452035]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-[#FF4DB8]" />
              <span>Recent PDF Operations ({history.length})</span>
            </h2>
            <p className="text-xs text-[#91808C] mt-0.5">
              {user
                ? 'Signed in: History is saved to your Account and cached locally so files stay previewable.'
                : 'Guest Mode: History is saved in Browser Local Storage so processed files stay previewable & downloadable.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              aria-label="Filter by PDF tool"
              className="px-3 py-2 text-xs rounded-xl border border-[#452035] bg-[#12000A] text-white font-medium focus:outline-hidden focus:border-[#FF1493]"
            >
              <option value="all">All PDF Tools</option>
              {TOOLS_CONFIG.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-[#FF4DB8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file or tool..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#452035] bg-[#12000A] text-white placeholder-[#91808C] focus:outline-hidden focus:border-[#FF1493]"
              />
            </div>

            {hasLocalItems && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#D9364F] text-white hover:brightness-110 cursor-pointer"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#C8B8C4] hover:bg-[#35001F] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#D9364F] bg-[#0B0007] border border-[#452035] hover:bg-[#35001F] transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#91808C]">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-[#452035] bg-[#0B0007] rounded-2xl">
            <FileText className="w-8 h-8 text-[#FF4DB8] mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">
              {history.length === 0 ? 'No PDF history yet' : 'No matching history entries'}
            </p>
            <p className="text-xs text-[#C8B8C4] mt-1 max-w-sm mx-auto">
              {history.length === 0
                ? `Process any PDF or photo using our ${TOOLS_CONFIG.length} free tools and it will automatically appear here.`
                : 'Try clearing your search filter or tool dropdown.'}
            </p>
            {history.length === 0 && (
              <button
                type="button"
                onClick={() => onSelectTool('merge-pdf')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] cursor-pointer"
              >
                <span>Open a PDF Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile-First Cards View */}
            <div className="space-y-3 md:hidden">
              {filteredHistory.map((item) => {
                const cachedFile = getSessionHistoryFile(item.id);
                const displayFile = item.outputFileName || item.fileName;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#0B0007] border border-[#452035] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF4DB8]">
                          <span className="w-2 h-2 rounded-full bg-[#FF1493]"></span>
                          {item.toolName}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate pr-1 mt-0.5">
                          {displayFile}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1FA971]/15 text-[#1FA971] border border-[#1FA971]/35 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </span>
                    </div>

                    <p className="text-[11px] text-[#C8B8C4] line-clamp-2">{item.resultSummary}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#91808C] pt-1.5 border-t border-[#452035]">
                      <span className="whitespace-nowrap">
                        {item.fileSize > 0 ? `${(item.fileSize / 1024).toFixed(1)} KB` : 'N/A'} •{' '}
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cachedFile && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewTarget({
                                  file: cachedFile.blob,
                                  name: cachedFile.fileName,
                                  downloadUrl: cachedFile.downloadUrl,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#35001F] border border-[#452035] hover:border-[#FF1493] text-[#FF4DB8] font-bold text-[11px] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>Preview</span>
                            </button>
                            <MonetagDownloadLink
                              downloadUrl={cachedFile.downloadUrl}
                              fileName={cachedFile.fileName}
                              className="px-2.5 py-1 rounded-lg bg-[#1FA971] text-white font-bold text-[11px] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              <span>Ad &amp; Save</span>
                            </MonetagDownloadLink>
                          </>
                        )}
                        {item.source !== 'cloud' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item.id)}
                            className="p-1 text-[#C8B8C4] hover:text-[#D9364F] cursor-pointer"
                            aria-label="Delete history entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0007] text-[#C8B8C4] font-semibold uppercase tracking-wider border-b border-[#452035]">
                  <tr>
                    <th className="py-3 px-4">Tool Used</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Summary</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#452035]/60">
                  {filteredHistory.map((item) => {
                    const cachedFile = getSessionHistoryFile(item.id);
                    const displayFile = item.outputFileName || item.fileName;
                    return (
                      <tr key={item.id} className="hover:bg-[#35001F]/35 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF1493] shrink-0"></span>
                            <span>{item.toolName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white truncate max-w-[200px]" title={displayFile}>
                          {displayFile}
                        </td>
                        <td className="py-3.5 px-4 text-[#C8B8C4] whitespace-nowrap">
                          {item.fileSize > 0 ? `${(item.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-[#C8B8C4] truncate max-w-[230px]" title={item.resultSummary}>
                          {item.resultSummary}
                        </td>
                        <td className="py-3.5 px-4 text-[#91808C] whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {cachedFile ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewTarget({
                                      file: cachedFile.blob,
                                      name: cachedFile.fileName,
                                      downloadUrl: cachedFile.downloadUrl,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#35001F] border border-[#452035] hover:border-[#FF1493] text-[#FF4DB8] font-bold text-[11px] cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  Preview
                                </button>
                                <MonetagDownloadLink
                                  downloadUrl={cachedFile.downloadUrl}
                                  fileName={cachedFile.fileName}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1FA971] text-white hover:brightness-110 font-bold text-[11px] cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Watch Ad &amp; Save</span>
                                </MonetagDownloadLink>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1FA971]/15 text-[#1FA971] border border-[#1FA971]/35">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </span>
                            )}
                            {item.source !== 'cloud' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item.id)}
                                className="p-1 text-[#C8B8C4] hover:text-[#D9364F] cursor-pointer"
                                aria-label="Delete history entry"
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
          </>
        )}
      </div>

      {/* Quick Launch Tools Grid */}
      <div className="bg-[#16000D] rounded-3xl p-5 sm:p-6 border border-[#452035]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Quick Launch Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {TOOLS_CONFIG.slice(0, 6).map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className="p-3 rounded-2xl bg-[#0B0007] hover:bg-[#35001F] border border-[#452035] hover:border-[#FF1493] text-center transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#16000D] border border-[#452035] mx-auto flex items-center justify-center text-[#C8B8C4] group-hover:text-[#FF4DB8] mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <span className="block text-xs font-bold text-white truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Standardized Adsterra 300x250 Dashboard Banner */}
      <AdsterraAdBanner
        adKey={ADSTERRA_BANNERS.banner_300x250.key}
        width={ADSTERRA_BANNERS.banner_300x250.width}
        height={ADSTERRA_BANNERS.banner_300x250.height}
      />

      {/* Preview Modal for in-session history items */}
      <PdfPreviewModal
        isOpen={!!previewTarget}
        file={previewTarget?.file || null}
        fileName={previewTarget?.name}
        downloadUrl={previewTarget?.downloadUrl}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
};
