/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Download, CheckCircle2, X, Loader2 } from 'lucide-react';
import {
  MONETAG_DIRECT_LINK_URL,
  triggerBlobFileDownload,
} from '../utils/monetag.js';

interface MonetagDownloadLinkProps {
  downloadUrl: string;
  fileName: string;
  className?: string;
  title?: string;
  children: React.ReactNode | ((state: { downloading: boolean; completed: boolean }) => React.ReactNode);
}

/**
 * Opens Monetag Direct Link ad cleanly in a new browser tab via native <a target="_blank">,
 * displays a visible Sponsor Ad & Download status modal (ensuring the ad link stays accessible even
 * inside iframes or mobile browsers that block popups), and triggers the processed file download.
 */
export const MonetagDownloadLink: React.FC<MonetagDownloadLinkProps> = ({
  downloadUrl,
  fileName,
  className = '',
  title,
  children,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (!showAdDialog) return;
    if (countdown <= 0) {
      triggerBlobFileDownload(downloadUrl, fileName);
      setDownloading(false);
      setCompleted(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 600);
    return () => clearTimeout(timer);
  }, [showAdDialog, countdown, downloadUrl, fileName]);

  const handleClick = () => {
    setDownloading(true);
    setCompleted(false);
    setCountdown(2);
    setShowAdDialog(true);
  };

  return (
    <>
      <a
        href={MONETAG_DIRECT_LINK_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={className}
        title={title || `Watch Ad & Download ${fileName} (Ad opens in a new tab)`}
      >
        {typeof children === 'function' ? children({ downloading, completed }) : children}
      </a>

      {showAdDialog &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Sponsor Ad & Download"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-[#FFE3EE] w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#24212A] via-[#3B1226] to-[#550B2E] p-5 text-white relative">
                <button
                  type="button"
                  onClick={() => setShowAdDialog(false)}
                  aria-label="Close download dialog"
                  className="p-1.5 rounded-full text-rose-200 hover:text-white hover:bg-white/10 absolute top-4 right-4 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E83E8C] text-white mb-2">
                  Keeps OminiPDF 100% Free
                </span>
                <h3 className="text-lg font-black">Watch Sponsor Ad &amp; Download</h3>
                <p className="text-xs text-rose-100/90 mt-0.5 truncate">File: {fileName}</p>
              </div>

              <div className="p-5 space-y-4 text-center">
                <div className="p-3.5 rounded-2xl bg-[#FFF4F8] border border-[#FFE3EE] space-y-2">
                  {countdown > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#C92B72]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#E83E8C]" />
                      <span>Sponsor ad opened • Starting download in {countdown}s...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1FA971]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Your download has started!</span>
                    </div>
                  )}

                  <p className="text-[11px] text-[#77717B] leading-relaxed">
                    A sponsor page opened in a new tab to keep all 11 PDF tools 100% free. If your browser blocked the new tab, click below to open the Sponsor Ad directly.
                  </p>

                  <a
                    href={MONETAG_DIRECT_LINK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E83E8C] to-[#C92B72] hover:brightness-105 shadow-sm transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Sponsor Ad (New Tab)</span>
                  </a>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href={downloadUrl}
                    download={fileName}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#1FA971] hover:bg-[#168a5c] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{countdown > 0 ? 'Save File Immediately' : 'Download Again'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowAdDialog(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#24212A] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
