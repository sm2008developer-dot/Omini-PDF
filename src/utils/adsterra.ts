/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdsterraBannerType = 'banner_320x50' | 'banner_300x250';

export interface AdsterraBannerConfig {
  id?: AdsterraBannerType | string;
  key: string;
  format: 'iframe';
  width: number;
  height: number;
  scriptSrc: string;
}

export const ADSTERRA_SCRIPT_BASE_URL = 'https://bauval.org/22';

export const ADSTERRA_BANNERS: Record<AdsterraBannerType, AdsterraBannerConfig> = {
  banner_320x50: {
    id: 'banner_320x50',
    key: '65be41244b5d389c3a8c4560aaacb4fb',
    format: 'iframe',
    width: 320,
    height: 50,
    scriptSrc: `${ADSTERRA_SCRIPT_BASE_URL}/65be41244b5d389c3a8c4560aaacb4fb`,
  },
  banner_300x250: {
    id: 'banner_300x250',
    key: '88544a428c1216bfa203febd9647cfd9',
    format: 'iframe',
    width: 300,
    height: 250,
    scriptSrc: `${ADSTERRA_SCRIPT_BASE_URL}/88544a428c1216bfa203febd9647cfd9`,
  },
};

/**
 * Sanitizes an Adsterra ad key to safe alphanumeric characters so it can safely
 * be interpolated inside an isolated iframe srcDoc script.
 */
export function sanitizeAdsterraKey(adKey: string): string {
  return String(adKey || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Builds a normalized AdsterraBannerConfig from explicit adKey, width, and height props.
 */
export function createAdsterraBannerConfig(params: {
  adKey: string;
  width: number;
  height: number;
  scriptSrc?: string;
}): AdsterraBannerConfig {
  const safeKey = sanitizeAdsterraKey(params.adKey);
  const safeWidth = Math.max(120, Math.min(1200, Math.round(Number(params.width) || 320)));
  const safeHeight = Math.max(50, Math.min(600, Math.round(Number(params.height) || 50)));

  return {
    id: `banner_${safeWidth}x${safeHeight}`,
    key: safeKey,
    format: 'iframe',
    width: safeWidth,
    height: safeHeight,
    scriptSrc: params.scriptSrc || `${ADSTERRA_SCRIPT_BASE_URL}/${safeKey}`,
  };
}

/**
 * Maps each site placement / layout to the optimal Adsterra banner unit:
 * - Top landing strip ('5477575344') or horizontal layouts use the slim 320x50 unit.
 * - Feature, in-article workspace, and in-feed dashboard slots use the 300x250 unit.
 */
export function selectAdsterraBannerForSlot(
  slotId: string,
  layout: 'in-article' | 'in-feed' | 'responsive' | 'horizontal' = 'responsive'
): AdsterraBannerConfig {
  if (layout === 'horizontal' || slotId === '5477575344') {
    return ADSTERRA_BANNERS.banner_320x50;
  }
  return ADSTERRA_BANNERS.banner_300x250;
}

/**
 * Generates an isolated iframe srcDoc HTML document for a single Adsterra banner.
 * Isolating each banner prevents global `window.atOptions` collisions when multiple
 * banners appear on the same page and keeps third-party document.write calls safe.
 */
export function buildAdsterraBannerSrcDoc(banner: AdsterraBannerConfig): string {
  const safeKey = sanitizeAdsterraKey(banner.key);
  const safeSrc = banner.scriptSrc || `${ADSTERRA_SCRIPT_BASE_URL}/${safeKey}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        color-scheme: dark;
        background-color: #0B0007;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${safeKey}',
        'format' : '${banner.format}',
        'height' : ${banner.height},
        'width' : ${banner.width},
        'params' : {}
      };
    </script>
    <script src="${safeSrc}"></script>
  </body>
</html>`;
}
