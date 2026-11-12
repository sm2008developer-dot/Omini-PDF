/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Crown, CheckCircle2 } from 'lucide-react';
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
  user,
  onOpenUpgrade,
  layout = 'responsive',
  layoutKey,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);
  const [isFilled, setIsFilled] = useState(false);
  const isPro = Boolean(user && user.plan === 'pro');

  useEffect(() => {
    // Pro subscribers get an ad-free experience
    if (isPro) return;
    if (isPushed.current) return;

    let retryTimer: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 20;

    const pushAd = () => {
      attempts++;
      if (typeof window === 'undefined') return;

      const adElement = adRef.current;
      // Ensure the DOM element is attached and has not already been filled
      if (!adElement || !document.body.contains(adElement)) {
        if (attempts < maxAttempts) {
          retryTimer = setTimeout(pushAd, 200);
        }
        return;
      }

      // Check if adsbygoogle already processed this specific element
      if (adElement.getAttribute('data-adsbygoogle-status')) {
        isPushed.current = true;
        return;
      }

      // Ensure window.adsbygoogle is ready
      if ((window as any).adsbygoogle) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          isPushed.current = true;
        } catch (err) {
          // If already pushed or duplicate, ignore error safely
          console.debug('AdSense push notice for slot', slotId, err);
        }
      } else {
        // External AdSense library may still be downloading; retry shortly
        if (attempts < maxAttempts) {
          retryTimer = setTimeout(pushAd, 250);
        }
      }
    };

    // Small delay ensures child <ins> is completely painted in React virtual DOM
    const initialDelay = setTimeout(pushAd, 150);

    return () => {
      clearTimeout(initialDelay);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isPro, slotId]);

  useEffect(() => {
    if (isPro) return;
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
  }, [isPro]);

  // Pro users have a 100% ad-free experience (No ads rendered)
  if (isPro) {
    return null;
  }

  const isFluid = layout === 'in-article' || layout === 'in-feed' || Boolean(layoutKey);

  return (
    <div
      className={`w-full my-6 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all text-center ${className}`}
    >
      {/* Ad Label & Remove Ads Pro Trigger */}
      <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-200/60 text-[10px] text-slate-400 font-medium tracking-wider">
        <span className="uppercase tracking-widest text-slate-500 font-semibold">ADVERTISEMENT</span>
        {onOpenUpgrade && (
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[10px] transition-colors cursor-pointer"
            title="Upgrade to Pro to remove all ads and get unlimited PDF and AI operations"
          >
            <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
            <span>Remove Ads (Go Pro)</span>
          </button>
        )}
      </div>

      {/* Google AdSense Unit */}
      <div className="min-h-[90px] flex flex-col items-center justify-center overflow-hidden">
        {!isFilled && (
          <div className="w-full py-3.5 px-3 rounded-xl border border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center text-center space-y-1 mb-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-blue-600" />
              <span>Google AdSense Slot #{slotId} Connected</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Live ads will appear here once Google completes domain review for <strong>ominipdf.ai.studio</strong>.
            </p>
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
