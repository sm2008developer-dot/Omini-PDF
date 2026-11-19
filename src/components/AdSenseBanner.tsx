/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { User } from '../utils/api.js';
import { selectAdsterraBannerForSlot } from '../utils/adsterra.js';
import { AdsterraAdBanner } from './AdsterraAdBanner.js';

interface AdSenseBannerProps {
  slotId: string;
  user?: User | null;
  onOpenUpgrade?: () => void;
  layout?: 'in-article' | 'in-feed' | 'responsive' | 'horizontal';
  layoutKey?: string;
  className?: string;
}

/**
 * Compatibility wrapper delegating legacy slot definitions to the standardized
 * reusable `AdsterraAdBanner` component.
 */
export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId,
  layout = 'responsive',
  className = '',
}) => {
  const banner = useMemo(
    () => selectAdsterraBannerForSlot(slotId, layout),
    [slotId, layout]
  );

  return (
    <AdsterraAdBanner
      adKey={banner.key}
      width={banner.width}
      height={banner.height}
      scriptSrc={banner.scriptSrc}
      className={className}
    />
  );
};
