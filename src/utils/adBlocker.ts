/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ADSTERRA_BANNERS } from './adsterra.js';

export const ADBLOCK_DISMISS_STORAGE_KEY = 'omini_adblock_notice_dismissed_at';
export const ADBLOCK_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AdBlockerSignals {
  /** Cosmetic filter hid the bait element (display: none / visibility: hidden / opacity: 0) */
  baitHidden: boolean;
  /** Bait element collapsed to 0 height or was removed from the DOM */
  baitCollapsed: boolean;
  /** Ad network script fetch failed while browser reports online */
  networkBlocked: boolean;
  /** Whether the browser currently reports being online */
  isOnline?: boolean;
  /** Never prompt on /admin */
  isAdminRoute?: boolean;
}

/**
 * Pure decision helper: determines if an ad-blocker is active based on collected signals.
 * Avoids false positives when offline or on admin routes.
 */
export function evaluateAdBlockerSignals(signals: AdBlockerSignals): boolean {
  if (signals.isAdminRoute) return false;
  if (signals.baitHidden || signals.baitCollapsed) return true;
  if (signals.networkBlocked && signals.isOnline !== false) return true;
  return false;
}

/**
 * Checks whether the polite ad-blocker notice is allowed to show given the last dismissal timestamp.
 */
export function shouldShowAdBlockerNotice(
  dismissedAtMs: number | null,
  nowMs: number = Date.now(),
  cooldownMs: number = ADBLOCK_DISMISS_COOLDOWN_MS
): boolean {
  if (dismissedAtMs === null || !Number.isFinite(dismissedAtMs) || dismissedAtMs <= 0) {
    return true;
  }
  return nowMs - dismissedAtMs >= cooldownMs;
}

/**
 * Reads the persisted dismissal timestamp from localStorage safely.
 */
export function getAdBlockerDismissedAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADBLOCK_DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists a dismissal timestamp so the modal stays out of the user's way for the cooldown period.
 */
export function recordAdBlockerDismissal(nowMs: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADBLOCK_DISMISS_STORAGE_KEY, String(nowMs));
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

/**
 * Clears the dismissal timestamp (used when the user clicks "I've Paused It — Refresh").
 */
export function clearAdBlockerDismissal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ADBLOCK_DISMISS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Runs a lightweight, non-intrusive DOM bait check (catches cosmetic blockers like uBlock, ABP, AdGuard).
 */
function runDomBaitCheck(): Promise<{ baitHidden: boolean; baitCollapsed: boolean }> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !document.body) {
      resolve({ baitHidden: false, baitCollapsed: false });
      return;
    }

    const bait = document.createElement('div');
    bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad ad-banner adsbox';
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText =
      'width:1px!important;height:1px!important;position:fixed!important;left:-9999px!important;top:-9999px!important;pointer-events:none!important;';
    bait.innerHTML = '&nbsp;';

    document.body.appendChild(bait);

    // Wait two frames so extension cosmetic rules apply
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const isDetached = !document.body.contains(bait);
          const style = window.getComputedStyle(bait);
          const baitHidden =
            isDetached ||
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            bait.getAttribute('abp') !== null;
          const baitCollapsed =
            isDetached || bait.offsetHeight === 0 || bait.clientHeight === 0;
          resolve({ baitHidden, baitCollapsed });
        } catch {
          resolve({ baitHidden: false, baitCollapsed: false });
        } finally {
          bait.remove();
        }
      }, 120);
    });
  });
}

/**
 * Runs a short-timeout no-cors probe against the active Adsterra script host to detect
 * network-level blockers (uBlock Origin, Brave Shields, AdGuard, DNS blockers).
 */
async function runNetworkProbe(probeUrl: string, timeoutMs = 2500): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(probeUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return false;
  } catch (err) {
    // Aborted due to slow network is NOT treated as an ad-blocker to prevent false positives
    if (err instanceof DOMException && err.name === 'AbortError') {
      return false;
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Performs non-blocking ad-blocker detection using DOM bait + Adsterra network probe.
 * Respects admin routes and optional `?adblock-test=1` preview parameter.
 */
export async function detectAdBlocker(currentPath = '/'): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const isAdminRoute = currentPath.startsWith('/admin');
  if (isAdminRoute) return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('adblock-test') === '1') {
    return true;
  }

  const [baitResult, networkBlocked] = await Promise.all([
    runDomBaitCheck(),
    runNetworkProbe(ADSTERRA_BANNERS.banner_320x50.scriptSrc),
  ]);

  return evaluateAdBlockerSignals({
    baitHidden: baitResult.baitHidden,
    baitCollapsed: baitResult.baitCollapsed,
    networkBlocked,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isAdminRoute,
  });
}
