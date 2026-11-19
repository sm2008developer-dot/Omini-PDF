/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, HeartHandshake, RefreshCw, X, CheckCircle2 } from 'lucide-react';

export interface AdBlockerModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onReload: () => void;
}

/**
 * Non-intrusive, polite modal displayed when an ad-blocker is detected.
 * Never locks the user out of any PDF or photo tool — users can dismiss it
 * cleanly via button, close icon, backdrop click, or Escape key.
 */
export const AdBlockerModal: React.FC<AdBlockerModalProps> = ({
  isOpen,
  onDismiss,
  onReload,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adblock-modal-title"
      aria-describedby="adblock-modal-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="bg-[#16000D] rounded-3xl shadow-2xl border border-[#452035] w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0B0007] via-[#35001F] to-[#16000D] border-b border-[#452035] p-5 sm:p-6 text-center relative">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close ad-blocker notice"
            className="p-1.5 rounded-full text-[#C8B8C4] hover:text-white hover:bg-[#35001F] transition-colors absolute top-4 right-4 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-[#35001F] border border-[#FF1493]/40 text-[#FF4DB8] flex items-center justify-center mx-auto mb-3 shadow-sm shadow-[#E90083]/20">
            <ShieldAlert className="w-6 h-6 text-[#FF1493]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1FA971]/15 border border-[#1FA971]/40 text-[#1FA971] text-[10px] font-bold uppercase tracking-wider mb-2">
            <HeartHandshake className="w-3 h-3" />
            <span>100% Free Forever</span>
          </div>

          <h2
            id="adblock-modal-title"
            className="text-lg sm:text-xl font-serif font-extrabold text-white tracking-tight"
          >
            Ad-Blocker Detected
          </h2>
          <p
            id="adblock-modal-desc"
            className="text-xs sm:text-sm text-[#C8B8C4] mt-1.5 leading-relaxed"
          >
            OminiPDF stays 100% free, private, and watermark-free for everyone thanks to lightweight, non-intrusive ads.
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#0B0007] border border-[#452035] space-y-2.5 text-left">
            <p className="text-xs font-semibold text-white">
              Would you mind pausing your ad-blocker for OminiPDF?
            </p>
            <ul className="space-y-1.5 text-xs text-[#C8B8C4]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971] shrink-0 mt-0.5" />
                <span>Click your ad-blocker icon in the browser toolbar.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971] shrink-0 mt-0.5" />
                <span>Choose <strong className="text-white">Pause on this site</strong> or <strong className="text-white">Allow ads on OminiPDF</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971] shrink-0 mt-0.5" />
                <span>Refresh the page — all 24 PDF &amp; photo tools stay completely free.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onReload}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] shadow-md shadow-[#E90083]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>I&apos;ve Paused It — Refresh Page</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#C8B8C4] hover:text-white bg-[#12000A] hover:bg-[#35001F] border border-[#452035] transition-colors cursor-pointer"
            >
              Continue Anyway (Remind Me Later)
            </button>
          </div>

          <p className="text-[11px] text-[#91808C] text-center">
            No tools are locked — you can always dismiss this message and continue working freely.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
