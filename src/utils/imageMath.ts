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

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type PhotoFilterPresetMath =
  | 'original'
  | 'bw'
  | 'sepia'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'high-contrast';

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

export function computeColorDistanceSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Weighted perceptual RGB distance squared
  return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
}

/**
 * Perceptual YCbCr distance prioritizing hue/chroma fidelity over shadow/lighting variance.
 * Handles uneven indoor studio lighting and subtle wall/sky gradients far better than raw RGB.
 */
export function computePerceptualBgDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const dY = 0.299 * dr + 0.587 * dg + 0.114 * db;
  const dCb = -0.168736 * dr - 0.331264 * dg + 0.5 * db;
  const dCr = 0.5 * dr - 0.418688 * dg - 0.081312 * db;
  return Math.sqrt(0.45 * dY * dY + 2.4 * dCb * dCb + 2.4 * dCr * dCr);
}

/**
 * Samples points around all 4 edges of the canvas and clusters dominant backdrop colors.
 */
export function extractPerimeterBgSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number
): RgbColor[] {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const xMax = Math.max(0, w - 1);
  const yMax = Math.max(0, h - 1);
  const insetX = w >= 6 ? 1 : 0;
  const insetY = h >= 6 ? 1 : 0;

  const coords: Array<[number, number]> = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const px = Math.min(xMax, Math.max(0, Math.round((i / steps) * xMax)));
    const py = Math.min(yMax, Math.max(0, Math.round((i / steps) * yMax)));
    coords.push([px, insetY]);
    coords.push([px, Math.max(0, yMax - insetY)]);
    coords.push([insetX, py]);
    coords.push([Math.max(0, xMax - insetX), py]);
  }

  const clusters: Array<{ r: number; g: number; b: number; count: number }> = [];
  for (const [cx, cy] of coords) {
    const idx = (cy * w + cx) * 4;
    if (data[idx + 3] < 25) continue;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    let merged = false;
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      if (computePerceptualBgDistance(r, g, b, cl.r, cl.g, cl.b) <= 14) {
        const nextCount = cl.count + 1;
        cl.r = Math.round((cl.r * cl.count + r) / nextCount);
        cl.g = Math.round((cl.g * cl.count + g) / nextCount);
        cl.b = Math.round((cl.b * cl.count + b) / nextCount);
        cl.count = nextCount;
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({ r, g, b, count: 1 });
    }
  }

  if (clusters.length === 0) {
    return [{ r: 255, g: 255, b: 255 }];
  }

  // Keep dominant edge color clusters (supports solid & smooth gradient backgrounds without catching stray foreground border objects)
  clusters.sort((a, b) => b.count - a.count);
  const minVotes = Math.max(1, Math.floor(clusters[0].count * 0.25));
  return clusters
    .filter((c, i) => i === 0 || (c.count >= minVotes && i < 4))
    .map(({ r, g, b }) => ({ r, g, b }));
}

/**
 * Shared client-side background removal pixel processor used identically by both live preview
 * and full-resolution export so preview matches downloaded output 100%.
 */
export function processBackgroundRemovalPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    tolerance?: number;
    feather?: number;
    mode?: 'flood-edges' | 'global-color';
    sampleColor?: RgbColor | null;
  } = {}
): { removedCount: number; samplesUsed: RgbColor[] } {
  const totalPixels = width * height;
  const samples = options.sampleColor
    ? [options.sampleColor]
    : extractPerimeterBgSamples(data, width, height);

  const tolerance = Math.max(5, Math.min(130, options.tolerance ?? 42));
  const feather = Math.max(0, Math.min(35, options.feather ?? 12));
  const maxDist = tolerance + feather;

  const nearestBgSampleDist = (pixelIdx: number): { dist: number; sample: RgbColor } => {
    const p = pixelIdx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    let bestDist = Infinity;
    let bestSample = samples[0];
    for (let s = 0; s < samples.length; s++) {
      const d = computePerceptualBgDistance(r, g, b, samples[s].r, samples[s].g, samples[s].b);
      if (d < bestDist) {
        bestDist = d;
        bestSample = samples[s];
      }
    }
    return { dist: bestDist, sample: bestSample };
  };

  let removedCount = 0;
  const smoothstep = (t: number) => t * t * (3 - 2 * t);

  if ((options.mode || 'flood-edges') === 'flood-edges') {
    const visited = new Uint8Array(totalPixels);
    const isBgMask = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const trySeed = (x: number, y: number) => {
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      if (data[idx * 4 + 3] === 0 || nearestBgSampleDist(idx).dist <= maxDist) {
        isBgMask[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < width; x++) {
      trySeed(x, 0);
      trySeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      trySeed(0, y);
      trySeed(width - 1, y);
    }

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = (curr - cx) / width;

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx + 1 < width ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy + 1 < height ? curr + width : -1,
      ];

      for (let n = 0; n < 4; n++) {
        const nIdx = neighbors[n];
        if (nIdx < 0 || visited[nIdx]) continue;
        visited[nIdx] = 1;
        if (data[nIdx * 4 + 3] === 0 || nearestBgSampleDist(nIdx).dist <= maxDist) {
          isBgMask[nIdx] = 1;
          queue[tail++] = nIdx;
        }
      }
    }

    for (let idx = 0; idx < totalPixels; idx++) {
      if (!isBgMask[idx]) continue;
      const p = idx * 4;
      const { dist, sample } = nearestBgSampleDist(idx);
      if (dist <= tolerance || feather === 0) {
        data[p + 3] = 0;
        removedCount++;
      } else {
        const t = Math.max(0, Math.min(1, (dist - tolerance) / feather));
        const alphaRatio = smoothstep(t);
        data[p + 3] = Math.round(data[p + 3] * alphaRatio);
        // Gentle color-spill defringe on semi-transparent boundary pixels
        if (alphaRatio > 0.05 && alphaRatio < 0.95) {
          const blend = (1 - alphaRatio) * 0.45;
          data[p] = Math.max(0, Math.min(255, Math.round((data[p] - sample.r * blend) / (1 - blend))));
          data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - sample.g * blend) / (1 - blend))));
          data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - sample.b * blend) / (1 - blend))));
        }
        if (alphaRatio < 0.5) removedCount++;
      }
    }

    // 1-pass isolated edge speckle cleanup (prevents stray single-pixel halos)
    if (width > 3 && height > 3) {
      const alphaSnap = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) alphaSnap[i] = data[i * 4 + 3];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (alphaSnap[idx] < 16) continue;
          let transparentNbrs = 0;
          if (alphaSnap[idx - 1] < 24) transparentNbrs++;
          if (alphaSnap[idx + 1] < 24) transparentNbrs++;
          if (alphaSnap[idx - width] < 24) transparentNbrs++;
          if (alphaSnap[idx + width] < 24) transparentNbrs++;
          if (alphaSnap[idx - width - 1] < 24) transparentNbrs++;
          if (alphaSnap[idx - width + 1] < 24) transparentNbrs++;
          if (alphaSnap[idx + width - 1] < 24) transparentNbrs++;
          if (alphaSnap[idx + width + 1] < 24) transparentNbrs++;
          if (transparentNbrs >= 7 && nearestBgSampleDist(idx).dist <= maxDist * 1.2) {
            data[idx * 4 + 3] = 0;
            removedCount++;
          }
        }
      }
    }
  } else {
    for (let idx = 0; idx < totalPixels; idx++) {
      const p = idx * 4;
      const { dist, sample } = nearestBgSampleDist(idx);
      if (dist <= tolerance) {
        data[p + 3] = 0;
        removedCount++;
      } else if (feather > 0 && dist <= maxDist) {
        const t = Math.max(0, Math.min(1, (dist - tolerance) / feather));
        const alphaRatio = smoothstep(t);
        data[p + 3] = Math.round(data[p + 3] * alphaRatio);
        if (alphaRatio > 0.05 && alphaRatio < 0.95) {
          const blend = (1 - alphaRatio) * 0.45;
          data[p] = Math.max(0, Math.min(255, Math.round((data[p] - sample.r * blend) / (1 - blend))));
          data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - sample.g * blend) / (1 - blend))));
          data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - sample.b * blend) / (1 - blend))));
        }
      }
    }
  }

  return { removedCount, samplesUsed: samples };
}

/**
 * Pure pixel-buffer color & filter engine shared between preview & export.
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
  if (preset === 'vivid') satBoost *= 1.52;
  if (preset === 'vintage') satBoost *= 0.72;
  if (preset === 'bw') satBoost = 0;

  const extraContrast =
    preset === 'high-contrast'
      ? 1.48
      : preset === 'vivid'
      ? 1.18
      : preset === 'bw'
      ? 1.16
      : 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

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

    // 4. Rich Photographic Presets
    if (preset === 'sepia') {
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r = sr;
      g = sg;
      b = sb;
    } else if (preset === 'warm') {
      r = r * 1.10 + 22;
      g = g * 1.02 + 8;
      b = b * 0.84 - 22;
    } else if (preset === 'cool') {
      r = r * 0.86 - 18;
      g = g * 1.01 + 5;
      b = b * 1.12 + 26;
    } else if (preset === 'vintage') {
      // Matte faded film look: warm shadows + soft highlights
      r = r * 0.88 + 26;
      g = g * 0.85 + 22;
      b = b * 0.74 + 24;
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
