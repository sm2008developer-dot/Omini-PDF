/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PUSH_PROMPT_DISMISS_KEY = 'omini_push_prompt_dismissed_at';
export const PUSH_COMPLETION_NOTIFY_KEY = 'omini_push_notify_on_complete';
export const PUSH_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PushPermissionState = NotificationPermission | 'unsupported';

export interface PushStatusSnapshot {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  endpoint: string | null;
  notifyOnComplete: boolean;
}

export interface PushPromptEligibilityInput {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  dismissedAtMs: number | null;
  nowMs?: number;
  cooldownMs?: number;
  isAdminRoute?: boolean;
  forceTestTrigger?: boolean;
}

/**
 * Pure helper: converts a URL-safe base64 VAPID public key string into a Uint8Array
 * suitable for `PushManager.subscribe({ applicationServerKey })`.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const clean = String(base64String || '').trim();
  const padding = '='.repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, '+').replace(/_/g, '/');

  let rawData = '';
  if (typeof atob === 'function') {
    rawData = atob(base64);
  } else {
    rawData = Buffer.from(base64, 'base64').toString('binary');
  }

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Pure helper: determines whether the polite floating opt-in prompt should appear.
 */
export function evaluatePushPromptEligibility(input: PushPromptEligibilityInput): boolean {
  if (input.isAdminRoute) return false;
  if (input.forceTestTrigger) return true;
  if (!input.supported) return false;
  if (input.subscribed) return false;
  if (input.permission !== 'default') return false;

  const nowMs = input.nowMs ?? Date.now();
  const cooldownMs = input.cooldownMs ?? PUSH_PROMPT_COOLDOWN_MS;
  if (
    input.dismissedAtMs !== null &&
    Number.isFinite(input.dismissedAtMs) &&
    input.dismissedAtMs > 0 &&
    nowMs - input.dismissedAtMs < cooldownMs
  ) {
    return false;
  }

  return true;
}

/**
 * Pure helper: normalizes and validates a push notification payload before broadcast or display.
 */
export function formatNotificationPayload(input: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): { title: string; body: string; url: string; tag: string } {
  const title = String(input.title || '').trim().slice(0, 120) || 'OminiPDF Update';
  const body =
    String(input.body || '').trim().slice(0, 320) ||
    'Your 100% free online PDF & Photo toolkit has a new update.';
  const rawUrl = String(input.url || '/').trim();
  const safeUrl =
    rawUrl.startsWith('/') || /^https?:\/\//i.test(rawUrl) ? rawUrl : '/';
  const tag =
    String(input.tag || 'ominipdf-update')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 64) || 'ominipdf-update';

  return { title, body, url: safeUrl, tag };
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getPushPromptDismissedAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function recordPushPromptDismissal(nowMs: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, String(nowMs));
  } catch {
    // ignore storage errors
  }
}

export function getNotifyOnCompletePreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(PUSH_COMPLETION_NOTIFY_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setNotifyOnCompletePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUSH_COMPLETION_NOTIFY_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.debug('Service Worker registration notice:', err);
    return null;
  }
}

export async function getPushStatus(): Promise<PushStatusSnapshot> {
  const supported = isPushNotificationSupported();
  const notifyOnComplete = getNotifyOnCompletePreference();

  if (!supported) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      endpoint: null,
      notifyOnComplete,
    };
  }

  const permission = Notification.permission;
  try {
    const existingReg = await navigator.serviceWorker.getRegistration('/');
    if (!existingReg) {
      return {
        supported: true,
        permission,
        subscribed: false,
        endpoint: null,
        notifyOnComplete,
      };
    }

    const sub = await existingReg.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      subscribed: Boolean(sub && permission === 'granted'),
      endpoint: sub?.endpoint ?? null,
      notifyOnComplete,
    };
  } catch {
    return {
      supported: true,
      permission,
      subscribed: false,
      endpoint: null,
      notifyOnComplete,
    };
  }
}

export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  status: PushStatusSnapshot;
  message: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      status: await getPushStatus(),
      message: 'Push notifications are not supported on this browser.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      status: await getPushStatus(),
      message:
        permission === 'denied'
          ? 'Notifications are blocked in your browser settings. Please allow notifications for OminiPDF.'
          : 'Notification permission was dismissed.',
    };
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return {
      success: false,
      status: await getPushStatus(),
      message: 'Could not register the notification service worker.',
    };
  }

  await navigator.serviceWorker.ready;

  try {
    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyRes.ok || !keyData?.publicKey) {
      throw new Error(keyData?.error || 'Push server key unavailable.');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!saveRes.ok) {
      const errBody = await saveRes.json().catch(() => ({}));
      throw new Error(errBody?.error || 'Failed to save push subscription.');
    }

    const status = await getPushStatus();
    return {
      success: true,
      status,
      message: 'Push notifications enabled! You will receive helpful updates from OminiPDF.',
    };
  } catch (err) {
    const status = await getPushStatus();
    return {
      success: false,
      status,
      message:
        err instanceof Error
          ? err.message
          : 'Unable to activate push notifications right now.',
    };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  status: PushStatusSnapshot;
  message: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      status: await getPushStatus(),
      message: 'Push notifications are not supported in this browser.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }

    const status = await getPushStatus();
    return {
      success: true,
      status,
      message: 'Push notifications have been turned off.',
    };
  } catch (err) {
    const status = await getPushStatus();
    return {
      success: false,
      status,
      message: err instanceof Error ? err.message : 'Failed to unsubscribe.',
    };
  }
}

/**
 * Triggers a test push notification — first via real Web Push backend delivery if subscribed,
 * falling back cleanly to Service Worker local notification if Push Service is unreachable locally.
 */
export async function sendTestPushNotification(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return {
      success: false,
      message: 'Please enable notifications first before sending a test.',
    };
  }

  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    try {
      const res = await fetch('/api/push/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (res.ok) {
        return {
          success: true,
          message: 'Test push notification sent! Check your device notification tray.',
        };
      }
    } catch {
      // Fall back to direct Service Worker notification preview below
    }
  }

  if (registration && typeof registration.showNotification === 'function') {
    await registration.showNotification('OminiPDF Notifications Active', {
      body: 'You are all set! You will get notified about new tools and finished PDF jobs.',
      icon: '/favicon-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'ominipdf-test',
      data: { url: '/' },
    });
    return {
      success: true,
      message: 'Test notification delivered via Service Worker!',
    };
  }

  return {
    success: false,
    message: 'Could not display a test notification on this browser.',
  };
}

/**
 * Shows a subtle completion notification when a PDF/Photo job finishes
 * (only if the user enabled notifications + completion alerts and switched tabs).
 */
export async function notifyJobCompleted(toolName: string, fileName: string): Promise<void> {
  if (!isPushNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (!getNotifyOnCompletePreference()) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(`${toolName} Ready`, {
        body: `${fileName} finished processing and is ready to download.`,
        icon: '/favicon-192x192.png',
        badge: '/favicon-96x96.png',
        tag: 'ominipdf-job-complete',
        data: { url: window.location.pathname || '/' },
      });
    }
  } catch {
    // ignore silently
  }
}
