/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolId } from '../types.js';
import type { DocumentHistory } from './api.js';

export const HISTORY_STORAGE_KEY = 'omini_pdf_history_v1';
export const MAX_LOCAL_HISTORY_ITEMS = 50;

const IDB_NAME = 'omini_pdf_history_blobs_v1';
const IDB_STORE = 'files';
const MAX_IDB_BLOB_BYTES = 12 * 1024 * 1024; // 12 MB cap per item
const MAX_IDB_ITEMS = 20;

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

interface StoredBlobRecord {
  id: string;
  fileName: string;
  blob: Blob;
  savedAt: number;
}

function openBlobDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveBlobToIndexedDb(id: string, fileName: string, blob: Blob): Promise<void> {
  if (blob.size > MAX_IDB_BLOB_BYTES) return;
  const db = await openBlobDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, fileName, blob, savedAt: Date.now() } as StoredBlobRecord);

      // Trim oldest items beyond MAX_IDB_ITEMS
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = (allReq.result || []) as StoredBlobRecord[];
        if (records.length > MAX_IDB_ITEMS) {
          records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
          for (const stale of records.slice(MAX_IDB_ITEMS)) {
            store.delete(stale.id);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

async function deleteBlobFromIndexedDb(id: string): Promise<void> {
  const db = await openBlobDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

async function clearIndexedDbBlobs(): Promise<void> {
  const db = await openBlobDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

/**
 * Hydrates in-memory sessionFileCache from IndexedDB so Preview & Download buttons
 * in History keep working even after full page reloads.
 */
export async function hydrateHistoryBlobs(entries: LocalHistoryEntry[]): Promise<void> {
  const missingIds = entries.filter((e) => !sessionFileCache.has(e.id)).map((e) => e.id);
  if (missingIds.length === 0) return;

  const db = await openBlobDb();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      for (const id of missingIds) {
        const req = store.get(id);
        req.onsuccess = () => {
          const rec = req.result as StoredBlobRecord | undefined;
          if (rec?.blob) {
            sessionFileCache.set(id, {
              blob: rec.blob,
              fileName: rec.fileName,
              downloadUrl: URL.createObjectURL(rec.blob),
            });
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

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
  void deleteBlobFromIndexedDb(id);
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
  void clearIndexedDbBlobs();
}

export function cacheSessionHistoryFile(id: string, file: SessionCachedFile): void {
  sessionFileCache.set(id, file);
  // Cap in-memory blobs to avoid excessive memory usage
  if (sessionFileCache.size > 15) {
    const oldestKey = sessionFileCache.keys().next().value;
    if (oldestKey) sessionFileCache.delete(oldestKey);
  }
  void saveBlobToIndexedDb(id, file.fileName, file.blob);
}

export function getSessionHistoryFile(id: string): SessionCachedFile | undefined {
  return sessionFileCache.get(id);
}
