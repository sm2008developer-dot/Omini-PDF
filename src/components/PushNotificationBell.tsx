/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Send, Loader2, AlertCircle } from 'lucide-react';
import {
  PushStatusSnapshot,
  setNotifyOnCompletePreference,
  sendTestPushNotification,
} from '../utils/pushNotifications.js';

interface PushNotificationBellProps {
  status: PushStatusSnapshot;
  busy: boolean;
  onEnable: () => Promise<{ success: boolean; message: string }>;
  onDisable: () => Promise<{ success: boolean; message: string }>;
  onToggleJobNotify: (enabled: boolean) => void;
}

/**
 * Compact header notification bell with a sleek Dark Neon Pink settings popover.
 * Lets visitors enable/disable Web Push notifications, toggle background job alerts,
 * and trigger a live test notification without leaving their workflow.
 */
export const PushNotificationBell: React.FC<PushNotificationBellProps> = ({
  status,
  busy,
  onEnable,
  onDisable,
  onToggleJobNotify,
}) => {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleEnableClick = async () => {
    setFeedback(null);
    const res = await onEnable();
    setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
  };

  const handleDisableClick = async () => {
    setFeedback(null);
    const res = await onDisable();
    setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
  };

  const handleTestClick = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await sendTestPushNotification();
      setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
    } finally {
      setTesting(false);
    }
  };

  const isDenied = status.permission === 'denied';
  const isActive = status.subscribed && status.permission === 'granted';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setFeedback(null);
        }}
        aria-label="Notification settings"
        aria-expanded={open}
        title={isActive ? 'Push notifications enabled' : 'Manage push notifications'}
        className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
          open || isActive
            ? 'bg-[#35001F] text-[#FF4DB8] border-[#FF1493]/60'
            : 'bg-[#16000D] text-[#C8B8C4] hover:text-white hover:bg-[#35001F] border-[#452035]'
        }`}
      >
        {isActive ? (
          <BellRing className="w-4 h-4 text-[#FF4DB8]" />
        ) : isDenied ? (
          <BellOff className="w-4 h-4 text-[#91808C]" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {status.supported && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#0B0007] ${
              isActive
                ? 'bg-[#1FA971]'
                : isDenied
                  ? 'bg-[#D9364F]'
                  : 'bg-[#FF1493]'
            }`}
          />
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Push notification settings"
          className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 bg-[#16000D] rounded-2xl shadow-2xl shadow-black/80 border border-[#452035] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3.5 text-left"
        >
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#452035]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-[#FF1493]" />
                <span>Push Notifications</span>
              </h3>
              <p className="text-[11px] text-[#91808C] mt-0.5">
                Get alerts for new free tools &amp; finished PDF tasks.
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                isActive
                  ? 'bg-[#1FA971]/15 text-[#1FA971] border-[#1FA971]/40'
                  : isDenied
                    ? 'bg-[#D9364F]/15 text-[#D9364F] border-[#D9364F]/40'
                    : 'bg-[#35001F] text-[#FF4DB8] border-[#452035]'
              }`}
            >
              {isActive ? 'Active' : isDenied ? 'Blocked' : 'Off'}
            </span>
          </div>

          {!status.supported ? (
            <div className="p-3 rounded-xl bg-[#0B0007] border border-[#452035] text-xs text-[#C8B8C4]">
              This browser does not support Web Push notifications. Try Chrome, Edge, Firefox, or Safari on iOS 16.4+ (installed to Home Screen).
            </div>
          ) : isDenied ? (
            <div className="p-3 rounded-xl bg-[#D9364F]/10 border border-[#D9364F]/35 text-xs text-[#C8B8C4] space-y-1">
              <p className="font-semibold text-[#D9364F] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Notifications Blocked
              </p>
              <p className="text-[11px] leading-relaxed">
                Click the lock/site icon in your browser address bar, set <strong className="text-white">Notifications</strong> to <strong className="text-white">Allow</strong>, then refresh the page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Completion alerts toggle */}
              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B0007] border border-[#452035] cursor-pointer">
                <div>
                  <span className="block text-xs font-semibold text-white">
                    Background Job Alerts
                  </span>
                  <span className="block text-[10px] text-[#91808C]">
                    Notify when PDF/OCR processing finishes
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={status.notifyOnComplete}
                  onChange={(e) => {
                    setNotifyOnCompletePreference(e.target.checked);
                    onToggleJobNotify(e.target.checked);
                  }}
                  className="w-4 h-4 accent-[#FF1493] cursor-pointer"
                />
              </label>

              {isActive ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleTestClick}
                    disabled={testing || busy}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{testing ? 'Sending...' : 'Send Test Notification'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisableClick}
                    disabled={busy}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#C8B8C4] hover:text-white bg-[#12000A] hover:bg-[#35001F] border border-[#452035] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Turn Off Notifications
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableClick}
                  disabled={busy}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] shadow-sm shadow-[#E90083]/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BellRing className="w-3.5 h-3.5" />
                  )}
                  <span>{busy ? 'Activating...' : 'Enable Push Notifications'}</span>
                </button>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-[#1FA971]/15 border-[#1FA971]/40 text-[#1FA971]'
                  : 'bg-[#D9364F]/15 border-[#D9364F]/40 text-[#D9364F]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
