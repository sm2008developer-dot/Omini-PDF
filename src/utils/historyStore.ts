/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolId } from '../types.js';
import type { DocumentHistory } from './api.js';

export const HISTORY_STORAGE_KEY = 'omini_pdf_history_v1';
export const MAX_LOCAL_HISTORY_ITEMS = 50;

export interface LocalHistoryEntry extends DocumentHistory {
  toolId?: ToolId;
  outputFileName?: string;
  pageCount?: number;
  source?: 'local' | 'cloud';
}

export interface SessionCachedFile {
  blob: Blob;
  downloadUrl: string;
  fileName: string;
}

const sessionFileCache = new Map<string, SessionCachedFile>();

export function parseHistoryJson(raw: string | null): LocalHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalHistoryEntry =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.toolName === 'string' &&
        typeof item.fileName === 'string'
    );
  } catch {
    return [];
  }
}

export function prependHistoryItem(
  list: LocalHistoryEntry[],
  item: LocalHistoryEntry,
  maxItems = MAX_LOCAL_HISTORY_ITEMS
): LocalHistoryEntry[] {
  const deduped = list.filter((existing) => existing.id !== item.id);
  return [item, ...deduped].slice(0, Math.max(1, maxItems));
}

export function removeHistoryItemById(
  list: LocalHistoryEntry[],
  id: string
): LocalHistoryEntry[] {
  return list.filter((item) => item.id !== id);
}

export function mergeHistoryLists(
  localList: LocalHistoryEntry[],
  cloudList: DocumentHistory[]
): LocalHistoryEntry[] {
  const merged: LocalHistoryEntry[] = localList.map((item) => ({
    ...item,
    source: item.source || 'local',
  }));

  for (const cloudItem of cloudList) {
    const cloudTime = new Date(cloudItem.timestamp).getTime() || 0;
    const duplicate = merged.find((localItem) => {
      if (localItem.id === cloudItem.id) return true;
      const localTime = new Date(localItem.timestamp).getTime() || 0;
      const sameToolAndFile =
        localItem.toolName === cloudItem.toolName &&
        localItem.fileName === cloudItem.fileName &&
        Math.abs(localTime - cloudTime) < 10000;
      return sameToolAndFile;
    });

    if (!duplicate) {
      merged.push({
        ...cloudItem,
        source: 'cloud',
      });
    }
  }

  return merged.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
}

export function filterHistoryItems(
  list: LocalHistoryEntry[],
  query: string,
  toolFilter = 'all'
): LocalHistoryEntry[] {
  const cleanQuery = query.trim().toLowerCase();
  return list.filter((item) => {
    const matchesTool =
      toolFilter === 'all' ||
      item.toolId === toolFilter ||
      item.toolName.toLowerCase() === toolFilter.toLowerCase();
    if (!matchesTool) return false;
    if (!cleanQuery) return true;
    return (
      item.fileName.toLowerCase().includes(cleanQuery) ||
      (item.outputFileName || '').toLowerCase().includes(cleanQuery) ||
      item.toolName.toLowerCase().includes(cleanQuery) ||
      item.resultSummary.toLowerCase().includes(cleanQuery)
    );
  });
}

export function getLocalHistory(): LocalHistoryEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    return parseHistoryJson(window.localStorage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function saveLocalHistory(items: LocalHistoryEntry[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Unable to persist local history:', err);
  }
}

export function addLocalHistoryItem(payload: {
  userId?: string;
  toolId?: ToolId;
  toolName: string;
  fileName: string;
  outputFileName?: string;
  fileSize: number;
  pageCount?: number;
  resultSummary: string;
}): LocalHistoryEntry {
  const entry: LocalHistoryEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: payload.userId || 'guest',
    toolId: payload.toolId,
    toolName: payload.toolName,
    fileName: payload.fileName,
    outputFileName: payload.outputFileName,
    fileSize: payload.fileSize,
    pageCount: payload.pageCount,
    resultSummary: payload.resultSummary,
    timestamp: new Date().toISOString(),
    status: 'success',
    source: 'local',
  };

  const current = getLocalHistory();
  const updated = prependHistoryItem(current, entry);
  saveLocalHistory(updated);
  return entry;
}

export function deleteLocalHistoryItem(id: string): LocalHistoryEntry[] {
  const updated = removeHistoryItemById(getLocalHistory(), id);
  saveLocalHistory(updated);
  sessionFileCache.delete(id);
  return updated;
}

export function clearLocalHistory(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  sessionFileCache.clear();
}

export function cacheSessionHistoryFile(id: string, file: SessionCachedFile): void {
  sessionFileCache.set(id, file);
  // Cap in-memory blobs to avoid excessive memory usage
  if (sessionFileCache.size > 15) {
    const oldestKey = sessionFileCache.keys().next().value;
    if (oldestKey) sessionFileCache.delete(oldestKey);
  }
}

export function getSessionHistoryFile(id: string): SessionCachedFile | undefined {
  return sessionFileCache.get(id);
}
