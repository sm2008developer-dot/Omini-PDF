/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { User } from '../utils/api.js';

interface AdSenseBannerProps {
  slotId: string;
  user?: User | null;
  onOpenUpgrade?: () => void;
  layout?: 'in-article' | 'in-feed' | 'responsive' | 'horizontal';
  layoutKey?: string;
  className?: string;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId,
  layout = 'responsive',
  layoutKey,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);
  const [isFilled, setIsFilled] = useState(false);

  useEffect(() => {
    if (isPushed.current) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const maxAttempts = 20;

    const pushAd = () => {
      attempts++;
      if (typeof window === 'undefined') return;

      const adElement = adRef.current;
      if (!adElement || !document.body.contains(adElement)) {
        if (attempts < maxAttempts) {
          retryTimer = setTimeout(pushAd, 200);
        }
        return;
      }

      if (adElement.getAttribute('data-adsbygoogle-status')) {
        isPushed.current = true;
        return;
      }

      if ((window as any).adsbygoogle) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          isPushed.current = true;
        } catch (err) {
          console.debug('AdSense push notice for slot', slotId, err);
        }
      } else if (attempts < maxAttempts) {
        retryTimer = setTimeout(pushAd, 250);
      }
    };

    const initialDelay = setTimeout(pushAd, 150);

    return () => {
      clearTimeout(initialDelay);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [slotId]);

  useEffect(() => {
    const checkFilled = () => {
      if (adRef.current) {
        const hasIframe = adRef.current.querySelector('iframe');
        const status = adRef.current.getAttribute('data-ad-status');
        if (hasIframe || status === 'filled') {
          setIsFilled(true);
        }
      }
    };
    const timer = setInterval(checkFilled, 1500);
    return () => clearInterval(timer);
  }, []);

  const isFluid = layout === 'in-article' || layout === 'in-feed' || Boolean(layoutKey);

  return (
    <div
      className={`w-full my-6 p-3 bg-[#16000D] rounded-2xl border border-[#452035] overflow-hidden transition-all text-center ${className}`}
    >
      <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#452035] text-[10px] text-[#91808C] font-medium tracking-wider">
        <span className="uppercase tracking-widest font-semibold">SPONSORED</span>
        <span className="text-[10px] font-semibold text-[#1FA971]">Keeps OminiPDF 100% Free</span>
      </div>

      <div className="min-h-[90px] flex flex-col items-center justify-center overflow-hidden">
        {!isFilled && (
          <div className="w-full py-3 px-3 rounded-xl border border-dashed border-[#452035] bg-[#0B0007] flex flex-col items-center justify-center text-center space-y-1 mb-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#35001F] border border-[#452035] text-[#FF4DB8] text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#FF1493]" />
              <span>Google AdSense Slot #{slotId}</span>
            </div>
          </div>
        )}

        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center', minWidth: '250px' }}
          data-ad-client="ca-pub-4298726660310821"
          data-ad-slot={slotId}
          data-ad-format={isFluid ? 'fluid' : 'auto'}
          data-ad-layout={layout === 'in-article' ? 'in-article' : undefined}
          data-ad-layout-key={layoutKey || (layout === 'in-feed' ? '-f9+4w+7x-eg+3a' : undefined)}
          data-full-width-responsive={isFluid ? undefined : 'true'}
        />
      </div>
    </div>
  );
};
