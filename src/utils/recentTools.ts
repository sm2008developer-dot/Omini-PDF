/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolId, TOOLS_CONFIG } from '../types.js';

export const RECENT_TOOLS_STORAGE_KEY = 'omini_recent_tools_v1';
export const MAX_RECENT_TOOLS = 3;

const VALID_TOOL_IDS = new Set<string>(TOOLS_CONFIG.map((t) => t.id));

export function isValidToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && VALID_TOOL_IDS.has(value);
}

export function parseRecentToolsJson(raw: string | null, maxItems = MAX_RECENT_TOOLS): ToolId[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<ToolId>();
    const result: ToolId[] = [];
    for (const item of parsed) {
      if (isValidToolId(item) && !seen.has(item)) {
        seen.add(item);
        result.push(item);
        if (result.length >= maxItems) break;
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function prependRecentTool(
  currentList: ToolId[],
  toolId: ToolId,
  maxItems = MAX_RECENT_TOOLS
): ToolId[] {
  if (!isValidToolId(toolId)) return currentList.slice(0, maxItems);
  const filtered = currentList.filter((id) => id !== toolId);
  return [toolId, ...filtered].slice(0, Math.max(1, maxItems));
}

export function getRecentToolIds(): ToolId[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    return parseRecentToolsJson(window.localStorage.getItem(RECENT_TOOLS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function recordRecentTool(toolId: ToolId, maxItems = MAX_RECENT_TOOLS): ToolId[] {
  const updated = prependRecentTool(getRecentToolIds(), toolId, maxItems);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(RECENT_TOOLS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }
  return updated;
}

export function clearRecentTools(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(RECENT_TOOLS_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
}
