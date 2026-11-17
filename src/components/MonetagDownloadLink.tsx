/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
 * Opens Monetag Direct Link ad cleanly in a new browser tab via native <a target="_blank">
 * and starts downloading the processed PDF/ZIP/image file cleanly without popup blockers or window.open.
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

  const handleClick = () => {
    setDownloading(true);
    setCompleted(false);

    // Let browser handle native target="_blank" tab transition first, then initiate download
    setTimeout(() => {
      triggerBlobFileDownload(downloadUrl, fileName);
      setDownloading(false);
      setCompleted(true);
      setTimeout(() => setCompleted(false), 3000);
    }, 300);
  };

  return (
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
  );
};
