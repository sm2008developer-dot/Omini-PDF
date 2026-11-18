/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NormalizedCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PhotoFilterPresetMath =
  | 'original'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'bw'
  | 'noir'
  | 'sepia'
  | 'vintage'
  | 'high-contrast'
  | 'cinematic'
  | 'golden-hour'
  | 'fade'
  | 'emerald'
  | 'rose-glow'
  | 'hdr-crisp'
  | 'invert';

export function clampCropRect(rect: NormalizedCropRect): NormalizedCropRect {
  const x = Math.max(0, Math.min(0.95, Number.isFinite(rect.x) ? rect.x : 0));
  const y = Math.max(0, Math.min(0.95, Number.isFinite(rect.y) ? rect.y : 0));
  const w = Math.max(0.05, Math.min(1 - x, Number.isFinite(rect.w) ? rect.w : 1));
  const h = Math.max(0.05, Math.min(1 - y, Number.isFinite(rect.h) ? rect.h : 1));
  return { x, y, w, h };
}

/**
 * Computes a true 1:1 pixel-square normalized crop centered inside any image dimension.
 */
export function computeAspectSquareCrop(width: number, height: number): NormalizedCropRect {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  if (w === h) return { x: 0, y: 0, w: 1, h: 1 };
  if (w > h) {
    const normW = h / w;
    return clampCropRect({ x: (1 - normW) / 2, y: 0, w: normW, h: 1 });
  }
  const normH = w / h;
  return clampCropRect({ x: 0, y: (1 - normH) / 2, w: 1, h: normH });
}

export function parseAspectRatioString(ratio: string): number | null {
  const clean = ratio.trim().toLowerCase();
  if (!clean || clean === 'original' || clean === 'custom') return null;
  if (clean.includes(':')) {
    const [wStr, hStr] = clean.split(':');
    const w = parseFloat(wStr);
    const h = parseFloat(hStr);
    if (w > 0 && h > 0) return w / h;
  }
  const num = parseFloat(clean);
  return num > 0 ? num : null;
}

export interface RatioDrawPlan {
  outW: number;
  outH: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function computeRatioCanvasDimensions(params: {
  srcW: number;
  srcH: number;
  ratio: string;
  customWidth?: number;
  customHeight?: number;
  mode: 'crop' | 'fit' | 'stretch';
  maxSide?: number;
}): RatioDrawPlan {
  const srcW = Math.max(1, Math.round(params.srcW));
  const srcH = Math.max(1, Math.round(params.srcH));
  const maxSide = params.maxSide ?? 4096;

  let outW = srcW;
  let outH = srcH;

  if (params.ratio === 'custom' && params.customWidth && params.customHeight) {
    outW = Math.max(16, Math.min(maxSide, Math.round(params.customWidth)));
    outH = Math.max(16, Math.min(maxSide, Math.round(params.customHeight)));
  } else {
    const parsedRatio = parseAspectRatioString(params.ratio);
    if (parsedRatio) {
      const baseLong = Math.max(srcW, srcH, 600);
      const boundedLong = Math.min(maxSide, baseLong);
      if (parsedRatio >= 1) {
        outW = Math.round(boundedLong);
        outH = Math.max(1, Math.round(boundedLong / parsedRatio));
      } else {
        outH = Math.round(boundedLong);
        outW = Math.max(1, Math.round(boundedLong * parsedRatio));
      }
    }
  }

  if (params.mode === 'stretch') {
    return {
      outW,
      outH,
      sx: 0,
      sy: 0,
      sw: srcW,
      sh: srcH,
      dx: 0,
      dy: 0,
      dw: outW,
      dh: outH,
    };
  }

  const srcAspect = srcW / srcH;
  const outAspect = outW / outH;

  if (params.mode === 'crop') {
    let sw = srcW;
    let sh = srcH;
    let sx = 0;
    let sy = 0;
    if (srcAspect > outAspect) {
      sw = Math.max(1, Math.round(srcH * outAspect));
      sx = Math.round((srcW - sw) / 2);
    } else if (srcAspect < outAspect) {
      sh = Math.max(1, Math.round(srcW / outAspect));
      sy = Math.round((srcH - sh) / 2);
    }
    return {
      outW,
      outH,
      sx,
      sy,
      sw,
      sh,
      dx: 0,
      dy: 0,
      dw: outW,
      dh: outH,
    };
  }

  // 'fit' mode: preserve entire source image centered inside outW x outH
  let dw = outW;
  let dh = outH;
  let dx = 0;
  let dy = 0;
  if (srcAspect > outAspect) {
    dw = outW;
    dh = Math.max(1, Math.round(outW / srcAspect));
    dy = Math.round((outH - dh) / 2);
  } else if (srcAspect < outAspect) {
    dh = outH;
    dw = Math.max(1, Math.round(outH * srcAspect));
    dx = Math.round((outW - dw) / 2);
  }
  return {
    outW,
    outH,
    sx: 0,
    sy: 0,
    sw: srcW,
    sh: srcH,
    dx,
    dy,
    dw,
    dh,
  };
}



/**
 * Pure pixel-buffer color & 16-preset filter engine shared between preview & export.
 */
export function applyPixelAdjustmentsToBuffer(
  data: Uint8ClampedArray,
  options: {
    preset?: PhotoFilterPresetMath;
    brightness?: number;
    contrast?: number;
    saturation?: number;
  }
): Uint8ClampedArray {
  const preset = options.preset || 'original';
  const brightDelta = ((options.brightness || 0) / 100) * 180;
  const cVal = Math.max(-95, Math.min(100, options.contrast || 0));
  const contrastFactor = (259 * (cVal * 2.2 + 255)) / (255 * (259 - cVal * 2.2));
  let satBoost = 1 + (options.saturation || 0) / 100;

  if (preset === 'vivid') satBoost *= 1.55;
  else if (preset === 'golden-hour') satBoost *= 1.25;
  else if (preset === 'hdr-crisp') satBoost *= 1.32;
  else if (preset === 'vintage') satBoost *= 0.72;
  else if (preset === 'fade') satBoost *= 0.82;
  else if (preset === 'bw' || preset === 'noir') satBoost = 0;

  const extraContrast =
    preset === 'high-contrast'
      ? 1.5
      : preset === 'noir'
      ? 1.62
      : preset === 'hdr-crisp'
      ? 1.28
      : preset === 'vivid'
      ? 1.18
      : preset === 'bw'
      ? 1.16
      : preset === 'cinematic'
      ? 1.14
      : 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (preset === 'invert') {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // 1. Brightness
    r += brightDelta;
    g += brightDelta;
    b += brightDelta;

    // 2. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    if (extraContrast !== 1) {
      r = extraContrast * (r - 128) + 128;
      g = extraContrast * (g - 128) + 128;
      b = extraContrast * (b - 128) + 128;
    }

    // 3. Saturation
    if (satBoost !== 1) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + satBoost * (r - lum);
      g = lum + satBoost * (g - lum);
      b = lum + satBoost * (b - lum);
    }

    // 4. Photographic Filter LUTs
    if (preset === 'sepia') {
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r = sr;
      g = sg;
      b = sb;
    } else if (preset === 'warm') {
      r = r * 1.1 + 22;
      g = g * 1.02 + 8;
      b = b * 0.84 - 22;
    } else if (preset === 'cool') {
      r = r * 0.86 - 18;
      g = g * 1.01 + 5;
      b = b * 1.12 + 26;
    } else if (preset === 'vintage') {
      r = r * 0.88 + 26;
      g = g * 0.85 + 22;
      b = b * 0.74 + 24;
    } else if (preset === 'noir') {
      // Punchy high-contrast silver film B&W
      r = r * 1.06 - 8;
      g = g * 1.06 - 8;
      b = b * 1.06 - 8;
    } else if (preset === 'cinematic') {
      // Teal shadows, warm skin/highlights
      const lumNorm = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
      const shadowWt = 1 - lumNorm;
      const highWt = lumNorm;
      r += highWt * 24 - shadowWt * 20;
      g += shadowWt * 10 + highWt * 4;
      b += shadowWt * 28 - highWt * 22;
    } else if (preset === 'golden-hour') {
      r = r * 1.15 + 26;
      g = g * 1.04 + 12;
      b = b * 0.76 - 14;
    } else if (preset === 'fade') {
      // Lifted matte blacks + soft highlights
      r = r * 0.82 + 32;
      g = g * 0.82 + 30;
      b = b * 0.84 + 34;
    } else if (preset === 'emerald') {
      r = r * 0.85 - 6;
      g = g * 1.12 + 12;
      b = b * 0.94 + 4;
    } else if (preset === 'rose-glow') {
      r = r * 1.1 + 18;
      g = g * 0.96 + 4;
      b = b * 1.05 + 14;
    } else if (preset === 'hdr-crisp') {
      // S-curve midtone micro-pop
      const curve = (v: number) => {
        const n = Math.max(0, Math.min(1, v / 255));
        const s = n < 0.5 ? 2 * n * n : 1 - Math.pow(-2 * n + 2, 2) / 2;
        return (n * 0.65 + s * 0.35) * 255;
      };
      r = curve(r);
      g = curve(g);
      b = curve(b);
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return data;
}



export interface BatchRenameOptions {
  baseName?: string;
  prefix?: string;
  suffix?: string;
  findText?: string;
  replaceText?: string;
  numbering?: 'none' | 'suffix' | 'prefix';
  startNumber?: number;
  casing?: 'keep' | 'lower' | 'slug';
}

export function applyBatchRenameRule(
  originalName: string,
  index: number,
  total: number,
  options: BatchRenameOptions
): string {
  const lastDot = originalName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot > 0 ? originalName.slice(lastDot).toLowerCase() : '';

  let stem = options.baseName && options.baseName.trim() ? options.baseName.trim() : rawStem;

  if (options.findText && options.findText.length > 0) {
    stem = stem.split(options.findText).join(options.replaceText ?? '');
  }

  if (options.prefix && options.prefix.trim()) {
    stem = `${options.prefix.trim()}${stem}`;
  }

  if (options.suffix && options.suffix.trim()) {
    stem = `${stem}${options.suffix.trim()}`;
  }

  const startNum = Number.isFinite(options.startNumber) ? Math.max(0, Math.round(options.startNumber!)) : 1;
  const numValue = startNum + index;
  const padWidth = total >= 100 ? 3 : total >= 10 ? 2 : 1;
  const padded = String(numValue).padStart(padWidth, '0');

  if (options.numbering === 'prefix') {
    stem = `${padded}_${stem}`;
  } else if (options.numbering === 'suffix' || (options.baseName?.trim() && total > 1 && options.numbering !== 'none')) {
    stem = `${stem}_${padded}`;
  }

  if (options.casing === 'lower') {
    stem = stem.toLowerCase();
  } else if (options.casing === 'slug') {
    stem = stem
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  const safeStem = stem.replace(/[\\/:*?"<>|]/g, '_').trim() || `renamed_file_${index + 1}`;
  return `${safeStem}${ext}`;
}

export function buildBatchRenamePlan(originalNames: string[], options: BatchRenameOptions): string[] {
  const used = new Map<string, number>();
  return originalNames.map((name, idx) => {
    let candidate = applyBatchRenameRule(name, idx, originalNames.length, options);
    const key = candidate.toLowerCase();
    const count = used.get(key) || 0;
    if (count > 0) {
      const dot = candidate.lastIndexOf('.');
      const stem = dot > 0 ? candidate.slice(0, dot) : candidate;
      const ext = dot > 0 ? candidate.slice(dot) : '';
      candidate = `${stem}_${count + 1}${ext}`;
    }
    used.set(key, count + 1);
    return candidate;
  });
}
