/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BellRing, X, Loader2 } from 'lucide-react';

interface PushOptInPromptProps {
  isOpen: boolean;
  busy: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

/**
 * Non-intrusive floating bottom-right notification opt-in prompt.
 * Never blocks tool interaction and respects a 7-day dismissal cooldown.
 */
export const PushOptInPrompt: React.FC<PushOptInPromptProps> = ({
  isOpen,
  busy,
  onAllow,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Enable OminiPDF push notifications"
      className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-5 sm:w-[360px] z-[55] bg-[#16000D] border border-[#452035] rounded-2xl shadow-2xl shadow-black/75 p-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#35001F] border border-[#FF1493]/40 text-[#FF4DB8] flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5 text-[#FF1493]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white leading-snug">
              Enable Push Notifications
            </h3>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification prompt"
              className="p-1 rounded-lg text-[#91808C] hover:text-white hover:bg-[#35001F] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-[#C8B8C4] mt-1 leading-relaxed">
            Get instant alerts when heavy PDF/OCR jobs finish and stay updated on new free tools. Turn off anytime.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={onAllow}
              disabled={busy}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] shadow-sm shadow-[#E90083]/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span>{busy ? 'Enabling...' : 'Allow Notifications'}</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              disabled={busy}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-[#C8B8C4] hover:text-white bg-[#12000A] hover:bg-[#35001F] border border-[#452035] transition-colors cursor-pointer"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
