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

export interface NormalizedBrushStroke {
  points: Array<{ x: number; y: number }>;
  radius: number; // normalized fraction of min(width, height), e.g. 0.035
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
  return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
}

/**
 * Perceptual YCbCr distance balanced so neutral white/grey clothing stays intact
 * near light walls while gentle lighting shadows on backgrounds still clear cleanly.
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
  return Math.sqrt(0.62 * dY * dY + 2.25 * dCb * dCb + 2.25 * dCr * dCr);
}

/**
 * Smart perimeter sampling weighted heavily toward top/left/right backdrop edges
 * so centered portraits touching the bottom border don't poison backdrop color detection.
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

  // Each sample carries [x, y, weight]
  const coords: Array<[number, number, number]> = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const px = Math.min(xMax, Math.max(0, Math.round((i / steps) * xMax)));
    const py = Math.min(yMax, Math.max(0, Math.round((i / steps) * yMax)));
    // Top edge: primary backdrop region
    coords.push([px, insetY, 2]);
    // Left & right upper/mid edges
    const sideWeight = i <= 4 ? 2 : 1;
    coords.push([insetX, py, sideWeight]);
    coords.push([Math.max(0, xMax - insetX), py, sideWeight]);
    // Outer bottom corners only (skip center bottom where shirts/objects typically sit)
    if (i === 0 || i === steps) {
      coords.push([px, Math.max(0, yMax - insetY), 1]);
    }
  }

  const clusters: Array<{ r: number; g: number; b: number; weight: number }> = [];
  for (const [cx, cy, wt] of coords) {
    const idx = (cy * w + cx) * 4;
    if (data[idx + 3] < 25) continue;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    let merged = false;
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      if (computePerceptualBgDistance(r, g, b, cl.r, cl.g, cl.b) <= 15) {
        const nextWeight = cl.weight + wt;
        cl.r = Math.round((cl.r * cl.weight + r * wt) / nextWeight);
        cl.g = Math.round((cl.g * cl.weight + g * wt) / nextWeight);
        cl.b = Math.round((cl.b * cl.weight + b * wt) / nextWeight);
        cl.weight = nextWeight;
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({ r, g, b, weight: wt });
    }
  }

  if (clusters.length === 0) {
    return [{ r: 255, g: 255, b: 255 }];
  }

  clusters.sort((a, b) => b.weight - a.weight);
  const minWeight = Math.max(2, Math.floor(clusters[0].weight * 0.35));
  return clusters
    .filter((c, i) => i === 0 || (c.weight >= minWeight && i < 3))
    .map(({ r, g, b }) => ({ r, g, b }));
}

function rasterizeBrushStrokesToMask(
  strokes: NormalizedBrushStroke[] | undefined,
  width: number,
  height: number
): Uint8Array | null {
  if (!strokes || strokes.length === 0) return null;
  const mask = new Uint8Array(width * height);
  const minDim = Math.max(16, Math.min(width, height));

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    const radPx = Math.max(3, Math.round(stroke.radius * minDim));
    const radSq = radPx * radPx;

    const stamp = (cx: number, cy: number) => {
      const x0 = Math.max(0, cx - radPx);
      const x1 = Math.min(width - 1, cx + radPx);
      const y0 = Math.max(0, cy - radPx);
      const y1 = Math.min(height - 1, cy + radPx);
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy;
        const dySq = dy * dy;
        const row = y * width;
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          if (dx * dx + dySq <= radSq) {
            mask[row + x] = 255;
          }
        }
      }
    };

    for (let i = 0; i < stroke.points.length; i++) {
      const p1 = stroke.points[i];
      const x1 = Math.round(p1.x * width);
      const y1 = Math.round(p1.y * height);
      stamp(x1, y1);
      if (i > 0) {
        const p0 = stroke.points[i - 1];
        const x0 = Math.round(p0.x * width);
        const y0 = Math.round(p0.y * height);
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(2, radPx * 0.4)));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          stamp(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t));
        }
      }
    }
  }
  return mask;
}

/**
 * Edge-barrier aware perceptual YCbCr background removal with multi-swatch support
 * and optional user Keep / Erase touch-up brush masks.
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
    sampleColors?: RgbColor[];
    edgeBarrier?: boolean;
    keepStrokes?: NormalizedBrushStroke[];
    eraseStrokes?: NormalizedBrushStroke[];
  } = {}
): { removedCount: number; samplesUsed: RgbColor[] } {
  const totalPixels = width * height;
  const origAlpha = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) origAlpha[i] = data[i * 4 + 3];

  const samples: RgbColor[] =
    options.sampleColors && options.sampleColors.length > 0
      ? options.sampleColors
      : options.sampleColor
      ? [options.sampleColor]
      : extractPerimeterBgSamples(data, width, height);

  const tolerance = Math.max(5, Math.min(130, options.tolerance ?? 38));
  const feather = Math.max(0, Math.min(35, options.feather ?? 10));
  const maxDist = tolerance + feather;
  const useEdgeBarrier = options.edgeBarrier !== false;
  const maxStepJump = Math.max(18, tolerance * 0.72);

  const keepMask = rasterizeBrushStrokesToMask(options.keepStrokes, width, height);
  const eraseMask = rasterizeBrushStrokesToMask(options.eraseStrokes, width, height);

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
      if (visited[idx] || (keepMask && keepMask[idx] > 0)) return;
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
      const cp = curr * 4;
      const cr = data[cp];
      const cg = data[cp + 1];
      const cb = data[cp + 2];

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx + 1 < width ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy + 1 < height ? curr + width : -1,
      ];

      for (let n = 0; n < 4; n++) {
        const nIdx = neighbors[n];
        if (nIdx < 0 || visited[nIdx]) continue;
        if (keepMask && keepMask[nIdx] > 0) {
          visited[nIdx] = 1;
          continue;
        }
        const np = nIdx * 4;
        if (data[np + 3] === 0) {
          visited[nIdx] = 1;
          isBgMask[nIdx] = 1;
          queue[tail++] = nIdx;
          continue;
        }

        const { dist } = nearestBgSampleDist(nIdx);
        if (dist <= maxDist) {
          // Edge-barrier protection: stop at strong foreground edge transitions
          if (useEdgeBarrier && dist > tolerance * 0.52) {
            const stepJump = computePerceptualBgDistance(cr, cg, cb, data[np], data[np + 1], data[np + 2]);
            if (stepJump > maxStepJump) {
              continue;
            }
          }
          visited[nIdx] = 1;
          isBgMask[nIdx] = 1;
          queue[tail++] = nIdx;
        } else {
          visited[nIdx] = 1;
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
        if (alphaRatio > 0.05 && alphaRatio < 0.95) {
          const blend = (1 - alphaRatio) * 0.45;
          data[p] = Math.max(0, Math.min(255, Math.round((data[p] - sample.r * blend) / (1 - blend))));
          data[p + 1] = Math.max(0, Math.min(255, Math.round((data[p + 1] - sample.g * blend) / (1 - blend))));
          data[p + 2] = Math.max(0, Math.min(255, Math.round((data[p + 2] - sample.b * blend) / (1 - blend))));
        }
        if (alphaRatio < 0.5) removedCount++;
      }
    }

    // 1-pass isolated edge speckle cleanup
    if (width > 3 && height > 3) {
      const alphaSnap = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) alphaSnap[i] = data[i * 4 + 3];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (alphaSnap[idx] < 16 || (keepMask && keepMask[idx] > 0)) continue;
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
      if (keepMask && keepMask[idx] > 0) continue;
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
        if (alphaRatio < 0.5) removedCount++;
      }
    }
  }

  // Apply explicit user manual Erase & Keep strokes last so user corrections always win
  if (eraseMask || keepMask) {
    removedCount = 0;
    for (let idx = 0; idx < totalPixels; idx++) {
      const p = idx * 4;
      if (eraseMask && eraseMask[idx] > 0) {
        data[p + 3] = 0;
      }
      if (keepMask && keepMask[idx] > 0) {
        data[p + 3] = origAlpha[idx];
      }
      if (data[p + 3] < 128) removedCount++;
    }
  }

  return { removedCount, samplesUsed: samples };
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

/**
 * Shared real algorithmic photo enhancement processor (Adaptive Auto-Levels, Gamma Lift,
 * Document Scan cleanup, Skin-safe Vibrance, Edge-preserving Denoise, and Multi-pixel Unsharp Mask).
 * Used identically by both live preview & full-resolution export.
 */
export function processEnhancePhotoPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    preset?: 'auto' | 'document' | 'portrait' | 'vivid' | 'custom';
    sharpen?: number; // 0 - 100
    autoContrast?: number; // 0 - 100
    brightness?: number; // -50 to 50
    vibrance?: number; // 0 - 100
    denoise?: number; // 0 - 100
  } = {}
): Uint8ClampedArray {
  const preset = options.preset || 'auto';
  const sharpenAmt = Math.max(0, Math.min(100, options.sharpen ?? 55));
  const autoContrastAmt = Math.max(0, Math.min(100, options.autoContrast ?? 65));
  const brightnessVal = Math.max(-50, Math.min(50, options.brightness ?? 4));
  const vibranceAmt = Math.max(0, Math.min(100, options.vibrance ?? 35));
  const denoiseAmt = Math.max(0, Math.min(100, options.denoise ?? 12));

  const totalPixels = Math.max(1, width * height);
  const src = new Uint8ClampedArray(data);

  // Step 1: Luminance histogram + mean brightness for adaptive gamma lift
  const hist = new Uint32Array(256);
  let lumSum = 0;
  for (let i = 0; i < src.length; i += 4) {
    const lum = Math.min(255, Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]));
    hist[lum]++;
    lumSum += lum;
  }
  const meanLum = lumSum / totalPixels;

  let lowClip = 0;
  let highClip = 255;
  let acc = 0;
  const lowThresh = totalPixels * 0.02;
  const highThresh = totalPixels * 0.98;
  for (let l = 0; l < 256; l++) {
    acc += hist[l];
    if (acc < lowThresh) lowClip = l;
    if (acc >= highThresh && highClip === 255) highClip = l;
  }
  const rawSpan = highClip - lowClip;
  const span = Math.max(24, rawSpan);
  const contrastBlend = rawSpan < 12 ? 0 : autoContrastAmt / 100;

  // Adaptive shadow/midtone recovery when photo is dim (<115) or slightly flat
  const autoGamma = meanLum < 110 ? Math.max(0.68, 0.72 + (meanLum / 110) * 0.25) : 0.96;
  const gammaBlend = preset === 'document' ? 0 : (autoContrastAmt / 100) * 0.75;

  const denoiseBlend = (denoiseAmt / 100) * 0.55;
  const vibBoost = (vibranceAmt / 100) * 0.9;
  const brightShift = brightnessVal * 1.5;

  // Precompute 256-entry tonal LUT for speed & smooth S-curve
  const toneLut = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const stretched = Math.max(0, Math.min(255, ((v - lowClip) / span) * 255));
    let val = v * (1 - contrastBlend) + stretched * contrastBlend;
    if (gammaBlend > 0) {
      const gammaMapped = 255 * Math.pow(Math.max(0, val) / 255, autoGamma);
      val = val * (1 - gammaBlend) + gammaMapped * gammaBlend;
    }
    // Gentle S-curve clarity punch proportional to autoContrastAmt
    const norm = Math.max(0, Math.min(1, val / 255));
    const sVal = norm < 0.5 ? 2 * norm * norm : 1 - Math.pow(-2 * norm + 2, 2) / 2;
    const sMix = contrastBlend * 0.28;
    val = (norm * (1 - sMix) + sVal * sMix) * 255;
    toneLut[v] = val;
  }

  const working = new Float32Array(totalPixels * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const wIdx = (y * width + x) * 3;
      let r = src[idx];
      let g = src[idx + 1];
      let b = src[idx + 2];

      // Edge-preserving bilateral-lite denoise (only smooths pixels similar to neighbors)
      if (denoiseBlend > 0.02 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const nbrs = [idx - 4, idx + 4, idx - width * 4, idx + width * 4];
        let sumR = r;
        let sumG = g;
        let sumB = b;
        let wtSum = 1;
        for (let k = 0; k < 4; k++) {
          const ni = nbrs[k];
          const diff = Math.abs(src[ni] - r) + Math.abs(src[ni + 1] - g) + Math.abs(src[ni + 2] - b);
          if (diff < 68) {
            const wt = 1 - diff / 68;
            sumR += src[ni] * wt;
            sumG += src[ni + 1] * wt;
            sumB += src[ni + 2] * wt;
            wtSum += wt;
          }
        }
        r = r * (1 - denoiseBlend) + (sumR / wtSum) * denoiseBlend;
        g = g * (1 - denoiseBlend) + (sumG / wtSum) * denoiseBlend;
        b = b * (1 - denoiseBlend) + (sumB / wtSum) * denoiseBlend;
      }

      // Apply tonal LUT with fractional interpolation
      const mapLut = (val: number) => {
        const clamped = Math.max(0, Math.min(254.99, val));
        const lo = Math.floor(clamped);
        const frac = clamped - lo;
        return toneLut[lo] * (1 - frac) + toneLut[Math.min(255, lo + 1)] * frac;
      };
      r = mapLut(r) + brightShift;
      g = mapLut(g) + brightShift;
      b = mapLut(b) + brightShift;

      // Document mode: crisp paper whitening & dark text deepening
      if (preset === 'document') {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 168) {
          const whiten = Math.min(1, (lum - 168) / 55) * 0.72;
          r = r * (1 - whiten) + 255 * whiten;
          g = g * (1 - whiten) + 255 * whiten;
          b = b * (1 - whiten) + 255 * whiten;
        } else if (lum < 135) {
          const darken = 0.72;
          r *= darken;
          g *= darken;
          b *= darken;
        }
      }

      // Skin-safe Vibrance
      if (vibBoost > 0.01) {
        const avg = (r + g + b) / 3;
        const mx = Math.max(r, g, b);
        const amt = (1 - Math.min(1, Math.abs(mx - avg) / 140)) * vibBoost;
        r += (r - avg) * amt;
        g += (g - avg) * amt;
        b += (b - avg) * amt;
      }

      working[wIdx] = Math.max(0, Math.min(255, r));
      working[wIdx + 1] = Math.max(0, Math.min(255, g));
      working[wIdx + 2] = Math.max(0, Math.min(255, b));
    }
  }

  // Step 2: True Multi-Pixel Separable Box Unsharp Mask (radius=2 => crisp real-photo sharpening)
  const sharpStrength = (sharpenAmt / 100) * 1.45;
  if (sharpStrength > 0.02 && width > 5 && height > 5) {
    const horiz = new Float32Array(totalPixels * 3);
    const blurred = new Float32Array(totalPixels * 3);

    // Horizontal 5-tap pass
    for (let y = 0; y < height; y++) {
      const rowOff = y * width;
      for (let x = 0; x < width; x++) {
        const x0 = Math.max(0, x - 2);
        const x1 = Math.max(0, x - 1);
        const x3 = Math.min(width - 1, x + 1);
        const x4 = Math.min(width - 1, x + 2);
        const o = (rowOff + x) * 3;
        const i0 = (rowOff + x0) * 3;
        const i1 = (rowOff + x1) * 3;
        const i3 = (rowOff + x3) * 3;
        const i4 = (rowOff + x4) * 3;
        for (let c = 0; c < 3; c++) {
          horiz[o + c] =
            (working[i0 + c] + working[i1 + c] + working[o + c] + working[i3 + c] + working[i4 + c]) * 0.2;
        }
      }
    }

    // Vertical 5-tap pass
    for (let y = 0; y < height; y++) {
      const y0 = Math.max(0, y - 2) * width;
      const y1 = Math.max(0, y - 1) * width;
      const y2 = y * width;
      const y3 = Math.min(height - 1, y + 1) * width;
      const y4 = Math.min(height - 1, y + 2) * width;
      for (let x = 0; x < width; x++) {
        const o = (y2 + x) * 3;
        const j0 = (y0 + x) * 3;
        const j1 = (y1 + x) * 3;
        const j3 = (y3 + x) * 3;
        const j4 = (y4 + x) * 3;
        for (let c = 0; c < 3; c++) {
          blurred[o + c] =
            (horiz[j0 + c] + horiz[j1 + c] + horiz[o + c] + horiz[j3 + c] + horiz[j4 + c]) * 0.2;
        }
      }
    }

    for (let i = 0; i < totalPixels; i++) {
      const wIdx = i * 3;
      const pIdx = i * 4;
      for (let c = 0; c < 3; c++) {
        const diff = working[wIdx + c] - blurred[wIdx + c];
        // Tiny noise threshold (3) keeps smooth skin/sky clean while popping true edges
        const edgeDelta = Math.abs(diff) < 2.5 ? 0 : diff;
        data[pIdx + c] = Math.max(0, Math.min(255, Math.round(working[wIdx + c] + edgeDelta * sharpStrength)));
      }
      data[pIdx + 3] = src[pIdx + 3];
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const wIdx = i * 3;
      const pIdx = i * 4;
      data[pIdx] = Math.round(working[wIdx]);
      data[pIdx + 1] = Math.round(working[wIdx + 1]);
      data[pIdx + 2] = Math.round(working[wIdx + 2]);
      data[pIdx + 3] = src[pIdx + 3];
    }
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
