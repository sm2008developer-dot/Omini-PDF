/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  createAdsterraBannerConfig,
  buildAdsterraBannerSrcDoc,
} from '../utils/adsterra.js';

export interface AdsterraAdBannerProps {
  /** Adsterra placement key (e.g. '65be41244b5d389c3a8c4560aaacb4fb') */
  adKey: string;
  /** Banner width in pixels (e.g. 320 or 300) */
  width: number;
  /** Banner height in pixels (e.g. 50 or 250) */
  height: number;
  /** Optional override for the Adsterra script URL */
  scriptSrc?: string;
  /** Optional header label shown on the left side of the chrome bar */
  label?: string;
  /** Optional status label shown on the right side of the chrome bar */
  sublabel?: string;
  /** Whether to show the subtle SPONSORED header bar (default: true) */
  showChrome?: boolean;
  /** Optional additional wrapper classes */
  className?: string;
}

/**
 * Reusable, standardized Adsterra banner component.
 * Renders each banner inside a lazy-loaded, isolated `srcDoc` iframe so multiple
 * banners on the same page never overwrite each other's global `window.atOptions`.
 */
export const AdsterraAdBanner: React.FC<AdsterraAdBannerProps> = ({
  adKey,
  width,
  height,
  scriptSrc,
  label = 'SPONSORED',
  sublabel = 'Keeps OminiPDF 100% Free',
  showChrome = true,
  className = '',
}) => {
  const banner = useMemo(
    () => createAdsterraBannerConfig({ adKey, width, height, scriptSrc }),
    [adKey, width, height, scriptSrc]
  );

  const srcDoc = useMemo(() => buildAdsterraBannerSrcDoc(banner), [banner]);

  if (!banner.key) {
    return null;
  }

  return (
    <aside
      aria-label={`Sponsored advertisement ${banner.width} by ${banner.height}`}
      className={`w-full my-6 p-3 bg-[#16000D] rounded-2xl border border-[#452035] overflow-hidden transition-all text-center ${className}`}
    >
      {showChrome && (
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#452035] text-[10px] text-[#91808C] font-medium tracking-wider">
          <span className="uppercase tracking-widest font-semibold">{label}</span>
          <span className="text-[10px] font-semibold text-[#1FA971]">{sublabel}</span>
        </div>
      )}

      <div
        className="w-full rounded-xl border border-[#452035]/70 bg-[#0B0007] p-2 flex items-center justify-center overflow-hidden"
        style={{ minHeight: `${banner.height + 16}px` }}
      >
        <iframe
          key={`${banner.key}-${banner.width}x${banner.height}`}
          srcDoc={srcDoc}
          title={`Sponsored Banner ${banner.width}x${banner.height}`}
          width={banner.width}
          height={banner.height}
          loading="lazy"
          scrolling="no"
          style={{
            width: `${banner.width}px`,
            height: `${banner.height}px`,
            maxWidth: '100%',
          }}
          className="border-0 block mx-auto rounded-lg overflow-hidden bg-[#0B0007]"
          data-testid={`adsterra-banner-${banner.width}x${banner.height}`}
          data-adsterra-key={banner.key}
        />
      </div>
    </aside>
  );
};
