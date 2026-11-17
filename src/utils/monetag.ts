/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MONETAG_DIRECT_LINK_URL = 'https://uplcm.com/4/12282565';
export const MONETAG_VIGNETTE_ZONE = '12282581';
export const MONETAG_VIGNETTE_SCRIPT_SRC = 'https://n6wxm.com/vignette.min.js';
export const VIGNETTE_NAV_THRESHOLD = 3;
export const VIGNETTE_SESSION_COUNT_KEY = 'omini_vignette_nav_count';
export const VIGNETTE_SESSION_LOADED_KEY = 'omini_vignette_loaded';

export interface NavigationTrackerResult {
  nextCount: number;
  shouldInjectVignette: boolean;
}

/**
 * Pure helper to decide whether the Monetag vignette script should be injected
 * after a real SPA route change (requires >= 3 navigations and never runs on /admin).
 */
export function evaluateVignetteNavigation(params: {
  previousPath: string | null;
  nextPath: string;
  currentCount: number;
  alreadyInjected: boolean;
  threshold?: number;
}): NavigationTrackerResult {
  const {
    previousPath,
    nextPath,
    currentCount,
    alreadyInjected,
    threshold = VIGNETTE_NAV_THRESHOLD,
  } = params;

  const cleanPrev = previousPath ? previousPath.replace(/\/$/, '') || '/' : null;
  const cleanNext = nextPath.replace(/\/$/, '') || '/';

  // Initial page load does not count as a page change
  if (!cleanPrev || cleanPrev === cleanNext) {
    return {
      nextCount: currentCount,
      shouldInjectVignette: false,
    };
  }

  const nextCount = currentCount + 1;

  // Never interrupt admin console
  if (cleanNext === '/admin') {
    return {
      nextCount,
      shouldInjectVignette: false,
    };
  }

  const shouldInjectVignette = !alreadyInjected && nextCount >= threshold;
  return { nextCount, shouldInjectVignette };
}

/**
 * Triggers a client-side file download cleanly via an offscreen temporary anchor
 * (safe for blob: and same-origin URLs without blocking native target="_blank" links).
 */
export function triggerBlobFileDownload(downloadUrl: string, fileName: string): void {
  if (typeof document === 'undefined' || !downloadUrl) return;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName || 'document.pdf';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
  }, 1500);
}

/**
 * Dynamically injects the Monetag Vignette Banner script once when navigation threshold is reached.
 */
export function injectMonetagVignetteScript(): boolean {
  if (typeof document === 'undefined') return false;

  const existing = document.querySelector(`script[data-zone="${MONETAG_VIGNETTE_ZONE}"]`);
  if (existing) return false;

  try {
    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (!target) return false;

    const s = document.createElement('script');
    s.dataset.zone = MONETAG_VIGNETTE_ZONE;
    s.async = true;
    s.src = MONETAG_VIGNETTE_SCRIPT_SRC;
    target.appendChild(s);

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(VIGNETTE_SESSION_LOADED_KEY, 'true');
    }
    return true;
  } catch (err) {
    console.debug('Vignette script injection skipped:', err);
    return false;
  }
}

/**
 * Records a page navigation in sessionStorage and injects Vignette Banner after 3+ transitions.
 */
export function trackPageChangeForVignette(
  previousPath: string | null,
  nextPath: string
): NavigationTrackerResult {
  if (typeof window === 'undefined') {
    return { nextCount: 0, shouldInjectVignette: false };
  }

  let currentCount = 0;
  let alreadyLoadedInSession = false;

  try {
    currentCount = parseInt(window.sessionStorage.getItem(VIGNETTE_NAV_THRESHOLD_KEY_SAFE()) || '0', 10) || 0;
    alreadyLoadedInSession =
      window.sessionStorage.getItem(VIGNETTE_SESSION_LOADED_KEY) === 'true' ||
      Boolean(document.querySelector(`script[data-zone="${MONETAG_VIGNETTE_ZONE}"]`));
  } catch {
    alreadyLoadedInSession = Boolean(
      document.querySelector(`script[data-zone="${MONETAG_VIGNETTE_ZONE}"]`)
    );
  }

  const result = evaluateVignetteNavigation({
    previousPath,
    nextPath,
    currentCount,
    alreadyInjected: alreadyLoadedInSession,
  });

  try {
    window.sessionStorage.setItem(VIGNETTE_NAV_THRESHOLD_KEY_SAFE(), String(result.nextCount));
  } catch {
    // ignore storage errors
  }

  if (result.shouldInjectVignette) {
    // Yield slightly so route rendering completes before loading ad script
    setTimeout(() => {
      injectMonetagVignetteScript();
    }, 400);
  }

  return result;
}

function VIGNETTE_NAV_THRESHOLD_KEY_SAFE(): string {
  return VIGNETTE_SESSION_COUNT_KEY;
}
