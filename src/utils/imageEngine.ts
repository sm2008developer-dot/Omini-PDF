/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import UPNG from 'upng-js';
import type { ProcessedPdfResult } from './pdfEngine.js';
import {
  applyPixelAdjustmentsToBuffer,
  BatchRenameOptions,
  buildBatchRenamePlan,
  clampCropRect,
  computeRatioCanvasDimensions,
  NormalizedCropRect,
  processBackgroundRemovalPixels,
} from './imageMath.js';

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';

function formatToMime(format: ImageOutputFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

function formatToExt(format: ImageOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

function stripExt(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

export async function loadImageElement(file: File | Blob): Promise<{
  img: HTMLImageElement;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Unable to decode image file.'));
      img.src = url;
    });
    return {
      img,
      width: img.naturalWidth || img.width || 800,
      height: img.naturalHeight || img.height || 600,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageOutputFormat,
  quality = 0.9,
  pngPaletteColors = 0
): Promise<Blob> {
  const mime = formatToMime(format);
  const clampedQ = Math.max(0.05, Math.min(1, quality));

  if (format === 'png' && pngPaletteColors > 0) {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rgbaCopy = new Uint8Array(imgData.data.buffer.slice(0));
        const encoded = UPNG.encode([rgbaCopy.buffer], canvas.width, canvas.height, pngPaletteColors);
        return new Blob([encoded], { type: 'image/png' });
      }
    } catch (err) {
      console.warn('UPNG palette encoding fallback to lossless PNG:', err);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Browser failed to encode ${format.toUpperCase()} image.`));
      },
      mime,
      format === 'png' ? undefined : clampedQ
    );
  });
}

function drawCanvasWithBackground(
  width: number,
  height: number,
  format: ImageOutputFormat,
  bgColor = '#ffffff'
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is not available.');
  if (format === 'jpeg') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return { canvas, ctx };
}

/**
 * 1. COMPRESS IMAGE: Shrinks PNG (via UPNG palette quantization), JPG, or WebP by quality/scale or Target KB
 */
export async function compressImageFile(
  file: File,
  options: {
    format?: ImageOutputFormat;
    quality?: number; // 0.1 - 0.98
    targetKb?: number | null;
    maxWidth?: number | null;
  }
): Promise<
  ProcessedPdfResult & {
    originalSize: number;
    savedBytes: number;
    savedPercent: number;
    width: number;
    height: number;
  }
> {
  const originalSize = file.size;
  const detectedFormat: ImageOutputFormat =
    options.format ||
    (file.type.includes('webp') || /\.webp$/i.test(file.name)
      ? 'webp'
      : file.type.includes('png') || /\.png$/i.test(file.name)
      ? 'png'
      : 'jpeg');

  const { img, width: srcW, height: srcH } = await loadImageElement(file);

  const initialMaxW = options.maxWidth && options.maxWidth > 32 ? options.maxWidth : srcW;
  const baseScale = srcW > initialMaxW ? initialMaxW / srcW : 1;
  let bestBlob: Blob | null = null;
  let finalW = Math.max(1, Math.round(srcW * baseScale));
  let finalH = Math.max(1, Math.round(srcH * baseScale));

  const renderAtScale = async (
    s: number,
    q: number,
    pngColors = 0
  ): Promise<{ blob: Blob; w: number; h: number }> => {
    const w = Math.max(24, Math.round(srcW * s));
    const h = Math.max(24, Math.round(srcH * s));
    const { canvas, ctx } = drawCanvasWithBackground(w, h, detectedFormat, '#ffffff');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, detectedFormat, q, pngColors);
    return { blob, w, h };
  };

  const targetBytes =
    options.targetKb && options.targetKb > 0 ? Math.round(options.targetKb * 1024) : null;

  if (targetBytes) {
    if (detectedFormat === 'png') {
      // First quantize palette at current resolution (preserves full sharpness while dropping 55-80% size)
      for (const colors of [224, 144, 80, 40, 20]) {
        const res = await renderAtScale(baseScale, 1, colors);
        if (!bestBlob || res.blob.size < bestBlob.size) {
          bestBlob = res.blob;
          finalW = res.w;
          finalH = res.h;
        }
        if (res.blob.size <= targetBytes) break;
      }

      // If still larger than targetBytes, step resolution down alongside 64-color palette
      let currentScale = baseScale;
      for (let attempt = 0; attempt < 8 && bestBlob && bestBlob.size > targetBytes; attempt++) {
        const ratio = Math.sqrt(targetBytes / bestBlob.size);
        currentScale = Math.max(0.12, currentScale * Math.min(0.84, Math.max(0.45, ratio * 0.92)));
        const res = await renderAtScale(currentScale, 1, 64);
        if (res.blob.size < bestBlob.size) {
          bestBlob = res.blob;
          finalW = res.w;
          finalH = res.h;
        }
      }
    } else {
      // Binary search quality first (JPEG / WebP), then step down scale if needed
      let low = 0.08;
      let high = 0.95;
      for (let i = 0; i < 7; i++) {
        const mid = (low + high) / 2;
        const res = await renderAtScale(baseScale, mid);
        bestBlob = res.blob;
        finalW = res.w;
        finalH = res.h;
        if (res.blob.size > targetBytes) {
          high = mid;
        } else {
          low = mid;
        }
      }
      const atLow = await renderAtScale(baseScale, low);
      bestBlob = atLow.blob;
      finalW = atLow.w;
      finalH = atLow.h;

      let stepScale = baseScale;
      for (let sTry = 0; sTry < 6 && bestBlob.size > targetBytes; sTry++) {
        stepScale = Math.max(0.15, stepScale * 0.76);
        const res = await renderAtScale(stepScale, Math.max(0.18, low));
        bestBlob = res.blob;
        finalW = res.w;
        finalH = res.h;
      }
    }
  } else {
    const q = Math.max(0.1, Math.min(0.98, options.quality ?? 0.78));
    if (detectedFormat === 'png') {
      // Map quality slider (10..98%) cleanly to UPNG indexed palette colors (16..256)
      const colors = q >= 0.94 ? 0 : Math.max(16, Math.min(256, Math.round(16 + Math.pow(q, 1.35) * 240)));
      const res = await renderAtScale(baseScale, q, colors);
      bestBlob = res.blob;
      finalW = res.w;
      finalH = res.h;

      // If PNG output exceeds original on same-format PNG compression, apply tighter palette step
      if (bestBlob.size > originalSize && file.type.includes('png')) {
        const tighter = await renderAtScale(baseScale, q, Math.max(16, Math.round((colors || 128) * 0.45)));
        if (tighter.blob.size < bestBlob.size) {
          bestBlob = tighter.blob;
        }
      }
    } else {
      const res = await renderAtScale(baseScale, q);
      bestBlob = res.blob;
      finalW = res.w;
      finalH = res.h;
    }
  }

  const finalBlob = bestBlob!;
  const downloadUrl = URL.createObjectURL(finalBlob);
  const savedBytes = Math.max(0, originalSize - finalBlob.size);
  const savedPercent =
    originalSize > 0 ? Math.min(99, Math.round((savedBytes / originalSize) * 100)) : 0;

  return {
    blob: finalBlob,
    downloadUrl,
    fileName: `compressed_${stripExt(file.name)}.${formatToExt(detectedFormat)}`,
    fileSize: finalBlob.size,
    pageCount: 1,
    originalSize,
    savedBytes,
    savedPercent,
    width: finalW,
    height: finalH,
    summary:
      finalBlob.size <= originalSize
        ? `Compressed ${detectedFormat.toUpperCase()} (${finalW}×${finalH}) from ${(
            originalSize / 1024
          ).toFixed(1)} KB to ${(finalBlob.size / 1024).toFixed(1)} KB (${savedPercent}% smaller).`
        : `Encoded ${detectedFormat.toUpperCase()} (${finalW}×${finalH}) at ${(
            finalBlob.size / 1024
          ).toFixed(1)} KB (tip: try lower quality or WebP for smaller files).`,
  };
}

/**
 * 2. RESIZE / ASPECT RATIO & FORMAT CONVERTER (PNG / JPEG / WebP)
 */
export async function resizeAndConvertImage(
  file: File,
  options: {
    ratio: string;
    customWidth?: number;
    customHeight?: number;
    mode: 'crop' | 'fit' | 'stretch';
    format: ImageOutputFormat;
    quality?: number;
    backgroundColor?: string;
  }
): Promise<ProcessedPdfResult> {
  const { img, width: srcW, height: srcH } = await loadImageElement(file);
  const plan = computeRatioCanvasDimensions({
    srcW,
    srcH,
    ratio: options.ratio,
    customWidth: options.customWidth,
    customHeight: options.customHeight,
    mode: options.mode,
  });

  const bgColor = options.backgroundColor || '#ffffff';
  const canvas = document.createElement('canvas');
  canvas.width = plan.outW;
  canvas.height = plan.outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is not available.');

  if (options.format === 'jpeg' || options.mode === 'fit') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, plan.outW, plan.outH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    plan.sx,
    plan.sy,
    plan.sw,
    plan.sh,
    plan.dx,
    plan.dy,
    plan.dw,
    plan.dh
  );

  const blob = await canvasToBlob(canvas, options.format, options.quality ?? 0.92);
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `${stripExt(file.name)}_${plan.outW}x${plan.outH}.${formatToExt(options.format)}`,
    fileSize: blob.size,
    pageCount: 1,
    summary: `Converted to ${options.format.toUpperCase()} at ${plan.outW}×${plan.outH} px (${options.ratio} • ${options.mode}).`,
  };
}

/**
 * 3. PHOTO EDITOR: Crop, Rotate, Flip, Filters & Color Adjustments (Pure pixel math)
 */
export type PhotoFilterPreset =
  | 'original'
  | 'bw'
  | 'sepia'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'high-contrast';

export interface PhotoEditOptions {
  crop?: NormalizedCropRect;
  rotate?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  preset?: PhotoFilterPreset;
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  format?: ImageOutputFormat;
  quality?: number;
}

export function applyPixelAdjustments(
  imageData: ImageData,
  options: {
    preset?: PhotoFilterPreset;
    brightness?: number;
    contrast?: number;
    saturation?: number;
  }
): ImageData {
  applyPixelAdjustmentsToBuffer(imageData.data, options);
  return imageData;
}

export async function editPhotoFile(
  file: File,
  options: PhotoEditOptions
): Promise<ProcessedPdfResult> {
  const { img, width: srcW, height: srcH } = await loadImageElement(file);
  const crop = clampCropRect(options.crop || { x: 0, y: 0, w: 1, h: 1 });
  const sx = Math.round(crop.x * srcW);
  const sy = Math.round(crop.y * srcH);
  const sw = Math.max(4, Math.round(crop.w * srcW));
  const sh = Math.max(4, Math.round(crop.h * srcH));

  const rotate = options.rotate || 0;
  const swapDims = rotate === 90 || rotate === 270;
  const outW = swapDims ? sh : sw;
  const outH = swapDims ? sw : sh;
  const format = options.format || 'png';

  const { canvas, ctx } = drawCanvasWithBackground(outW, outH, format, '#ffffff');
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  if (
    (options.preset && options.preset !== 'original') ||
    (options.brightness && options.brightness !== 0) ||
    (options.contrast && options.contrast !== 0) ||
    (options.saturation && options.saturation !== 0)
  ) {
    const imgData = ctx.getImageData(0, 0, outW, outH);
    applyPixelAdjustments(imgData, {
      preset: options.preset,
      brightness: options.brightness,
      contrast: options.contrast,
      saturation: options.saturation,
    });
    ctx.putImageData(imgData, 0, 0);
  }

  const blob = await canvasToBlob(canvas, format, options.quality ?? 0.92);
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `edited_${stripExt(file.name)}.${formatToExt(format)}`,
    fileSize: blob.size,
    pageCount: 1,
    summary: `Edited photo (${outW}×${outH} px, filter: ${options.preset || 'original'}, rotate: ${rotate}°).`,
  };
}

/**
 * 4. HIGHLIGHT PHOTO: Draw highlighter strokes, highlight boxes, or spotlight dim mask
 */
export interface PhotoHighlightItem {
  id: string;
  kind: 'box' | 'spotlight' | 'stroke';
  color: string;
  opacity: number;
  lineWidth?: number;
  rect?: NormalizedCropRect;
  points?: Array<{ x: number; y: number }>;
}

export async function highlightPhotoFile(
  file: File,
  options: {
    annotations: PhotoHighlightItem[];
    format?: ImageOutputFormat;
    quality?: number;
  }
): Promise<ProcessedPdfResult> {
  const { img, width, height } = await loadImageElement(file);
  const format = options.format || 'png';
  const { canvas, ctx } = drawCanvasWithBackground(width, height, format, '#ffffff');
  ctx.drawImage(img, 0, 0, width, height);

  const spotlights = options.annotations.filter((a) => a.kind === 'spotlight' && a.rect);
  if (spotlights.length > 0) {
    // Dim the whole image, then punch out crisp spotlight windows
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    for (const spot of spotlights) {
      const r = clampCropRect(spot.rect!);
      ctx.rect(r.x * width, r.y * height, r.w * width, r.h * height);
    }
    ctx.fill('evenodd');

    for (const spot of spotlights) {
      const r = clampCropRect(spot.rect!);
      ctx.strokeStyle = spot.color || '#FACC15';
      ctx.lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.006));
      ctx.strokeRect(r.x * width, r.y * height, r.w * width, r.h * height);
    }
    ctx.restore();
  }

  for (const item of options.annotations) {
    if (item.kind === 'box' && item.rect) {
      const r = clampCropRect(item.rect);
      ctx.save();
      ctx.globalAlpha = Math.max(0.12, Math.min(0.85, item.opacity ?? 0.35));
      ctx.fillStyle = item.color || '#FACC15';
      ctx.fillRect(r.x * width, r.y * height, r.w * width, r.h * height);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = item.color || '#FACC15';
      ctx.lineWidth = Math.max(2, Math.round(Math.min(width, height) * 0.004));
      ctx.strokeRect(r.x * width, r.y * height, r.w * width, r.h * height);
      ctx.restore();
    } else if (item.kind === 'stroke' && item.points && item.points.length > 1) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.15, Math.min(0.85, item.opacity ?? 0.45));
      ctx.strokeStyle = item.color || '#FACC15';
      ctx.lineWidth = Math.max(8, (item.lineWidth || 24) * (width / 800));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(item.points[0].x * width, item.points[0].y * height);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x * width, item.points[i].y * height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const blob = await canvasToBlob(canvas, format, options.quality ?? 0.92);
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `highlighted_${stripExt(file.name)}.${formatToExt(format)}`,
    fileSize: blob.size,
    pageCount: 1,
    summary: `Applied ${options.annotations.length} highlight(s) to photo (${width}×${height} px).`,
  };
}

/**
 * 5. REMOVE BACKGROUND: Shared perceptual YCbCr edge flood-fill + chroma key + defringe (NO AI)
 */
export async function removeBackgroundAlgorithmic(
  file: File,
  options: {
    tolerance?: number; // 8 - 110
    feather?: number; // 0 - 30
    mode?: 'flood-edges' | 'global-color';
    sampleColor?: { r: number; g: number; b: number } | null;
    bgFill?: 'transparent' | string;
    format?: ImageOutputFormat;
  }
): Promise<ProcessedPdfResult> {
  const { img, width, height } = await loadImageElement(file);
  const format: ImageOutputFormat =
    options.bgFill && options.bgFill !== 'transparent'
      ? options.format || 'png'
      : options.format === 'jpeg'
      ? 'png'
      : options.format || 'png';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is not available.');
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const { removedCount } = processBackgroundRemovalPixels(imgData.data, width, height, {
    tolerance: options.tolerance ?? 42,
    feather: options.feather ?? 12,
    mode: options.mode || 'flood-edges',
    sampleColor: options.sampleColor ?? null,
  });

  ctx.putImageData(imgData, 0, 0);

  let outCanvas = canvas;
  if (options.bgFill && options.bgFill !== 'transparent') {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.fillStyle = options.bgFill;
    bgCtx.fillRect(0, 0, width, height);
    bgCtx.drawImage(canvas, 0, 0);
    outCanvas = bgCanvas;
  }

  const blob = await canvasToBlob(outCanvas, format, 0.94);
  const downloadUrl = URL.createObjectURL(blob);
  const pctRemoved = Math.round((removedCount / Math.max(1, width * height)) * 100);

  return {
    blob,
    downloadUrl,
    fileName: `nobg_${stripExt(file.name)}.${formatToExt(format)}`,
    fileSize: blob.size,
    pageCount: 1,
    summary: `Removed background (${pctRemoved}% pixels cleared) using client-side ${
      options.mode === 'global-color' ? 'chroma key' : 'edge flood-fill'
    }.`,
  };
}

/**
 * 6. PHOTO ENHANCE & SHARPEN: Histogram auto-levels + unsharp mask kernel + vibrance (NO AI)
 */
export async function enhancePhotoAlgorithmic(
  file: File,
  options: {
    preset?: 'auto' | 'document' | 'portrait' | 'vivid' | 'custom';
    sharpen?: number; // 0 - 100
    autoContrast?: number; // 0 - 100
    brightness?: number; // -50 to 50
    vibrance?: number; // 0 - 100
    denoise?: number; // 0 - 100
    format?: ImageOutputFormat;
    quality?: number;
  }
): Promise<ProcessedPdfResult> {
  const { img, width, height } = await loadImageElement(file);
  const format = options.format || 'png';
  const { canvas, ctx } = drawCanvasWithBackground(width, height, format, '#ffffff');
  ctx.drawImage(img, 0, 0, width, height);

  const preset = options.preset || 'auto';
  const sharpenAmt =
    options.sharpen ??
    (preset === 'document' ? 75 : preset === 'portrait' ? 35 : preset === 'vivid' ? 50 : 55);
  const autoContrastAmt =
    options.autoContrast ??
    (preset === 'document' ? 85 : preset === 'portrait' ? 45 : preset === 'vivid' ? 65 : 65);
  const vibranceAmt =
    options.vibrance ??
    (preset === 'document' ? 10 : preset === 'portrait' ? 28 : preset === 'vivid' ? 65 : 35);
  const brightnessVal = options.brightness ?? (preset === 'document' ? 8 : 4);
  const denoiseAmt = options.denoise ?? (preset === 'portrait' ? 30 : 12);

  const imgData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imgData.data);
  const data = imgData.data;

  // Step A: Build luminance histogram (1% - 99% bounds for deterministic auto-levels)
  const hist = new Uint32Array(256);
  const totalPixels = width * height;
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.min(255, Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
    hist[lum]++;
  }

  let lowClip = 0;
  let highClip = 255;
  let acc = 0;
  const lowThresh = totalPixels * 0.015;
  const highThresh = totalPixels * 0.985;
  for (let l = 0; l < 256; l++) {
    acc += hist[l];
    if (acc < lowThresh) lowClip = l;
    if (acc >= highThresh && highClip === 255) highClip = l;
  }
  const span = Math.max(24, highClip - lowClip);
  const contrastBlend = Math.max(0, Math.min(1, autoContrastAmt / 100));

  // Step B: Mild spatial denoise blend + Auto-Levels + Brightness + Vibrance
  const denoiseBlend = Math.max(0, Math.min(0.45, (denoiseAmt / 100) * 0.45));
  const vibBoost = Math.max(0, vibranceAmt / 100) * 0.8;
  const brightShift = brightnessVal * 1.4;

  const working = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = src[idx];
      let g = src[idx + 1];
      let b = src[idx + 2];

      if (denoiseBlend > 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const up = idx - width * 4;
        const dn = idx + width * 4;
        const lf = idx - 4;
        const rt = idx + 4;
        const avgR = (src[up] + src[dn] + src[lf] + src[rt] + r) / 5;
        const avgG = (src[up + 1] + src[dn + 1] + src[lf + 1] + src[rt + 1] + g) / 5;
        const avgB = (src[up + 2] + src[dn + 2] + src[lf + 2] + src[rt + 2] + b) / 5;
        r = r * (1 - denoiseBlend) + avgR * denoiseBlend;
        g = g * (1 - denoiseBlend) + avgG * denoiseBlend;
        b = b * (1 - denoiseBlend) + avgB * denoiseBlend;
      }

      if (contrastBlend > 0) {
        const sr = ((r - lowClip) / span) * 255;
        const sg = ((g - lowClip) / span) * 255;
        const sb = ((b - lowClip) / span) * 255;
        r = r * (1 - contrastBlend) + sr * contrastBlend;
        g = g * (1 - contrastBlend) + sg * contrastBlend;
        b = b * (1 - contrastBlend) + sb * contrastBlend;
      }

      r += brightShift;
      g += brightShift;
      b += brightShift;

      if (vibBoost > 0) {
        const avg = (r + g + b) / 3;
        const mx = Math.max(r, g, b);
        const amt = ((Math.abs(mx - avg) * 2) / 255) * -vibBoost + vibBoost;
        r += (r - avg) * amt;
        g += (g - avg) * amt;
        b += (b - avg) * amt;
      }

      working[idx] = Math.max(0, Math.min(255, r));
      working[idx + 1] = Math.max(0, Math.min(255, g));
      working[idx + 2] = Math.max(0, Math.min(255, b));
      working[idx + 3] = src[idx + 3];
    }
  }

  // Step C: 3x3 Unsharp Mask Convolution Sharpening Kernel
  const sharpWeight = Math.max(0, Math.min(1.5, (sharpenAmt / 100) * 1.1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (sharpWeight > 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const up = idx - width * 4;
        const dn = idx + width * 4;
        const lf = idx - 4;
        const rt = idx + 4;
        for (let c = 0; c < 3; c++) {
          const lap =
            4 * working[idx + c] -
            working[up + c] -
            working[dn + c] -
            working[lf + c] -
            working[rt + c];
          data[idx + c] = Math.max(0, Math.min(255, working[idx + c] + lap * (sharpWeight * 0.45)));
        }
      } else {
        data[idx] = working[idx];
        data[idx + 1] = working[idx + 1];
        data[idx + 2] = working[idx + 2];
      }
      data[idx + 3] = working[idx + 3];
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const blob = await canvasToBlob(canvas, format, options.quality ?? 0.92);
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `enhanced_${stripExt(file.name)}.${formatToExt(format)}`,
    fileSize: blob.size,
    pageCount: 1,
    summary: `Enhanced clarity (${preset} • sharpen ${sharpenAmt}%, auto-levels ${autoContrastAmt}%, vibrance ${vibranceAmt}%).`,
  };
}

/**
 * 7. RENAME PDF & PHOTOS: Renames single file cleanly or multi-file ZIP archive
 */
export async function renameFilesClient(
  files: File[],
  options: BatchRenameOptions
): Promise<ProcessedPdfResult> {
  if (files.length === 0) {
    throw new Error('Please upload at least one PDF or photo file to rename.');
  }

  const newNames = buildBatchRenamePlan(
    files.map((f) => f.name),
    options
  );

  if (files.length === 1) {
    const file = files[0];
    const newName = newNames[0];
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || (newName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
    });
    const downloadUrl = URL.createObjectURL(blob);
    return {
      blob,
      downloadUrl,
      fileName: newName,
      fileSize: blob.size,
      pageCount: 1,
      summary: `Renamed "${file.name}" → "${newName}".`,
    };
  }

  const zip = new JSZip();
  const extraFiles: NonNullable<ProcessedPdfResult['extraFiles']> = [];

  for (let i = 0; i < files.length; i++) {
    const buf = await files[i].arrayBuffer();
    const mime =
      files[i].type ||
      (newNames[i].endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const itemBlob = new Blob([buf], { type: mime });
    const itemUrl = URL.createObjectURL(itemBlob);
    zip.file(newNames[i], buf);
    extraFiles.push({
      name: newNames[i],
      url: itemUrl,
      size: itemBlob.size,
      blob: itemBlob,
    });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipBlob);

  return {
    blob: zipBlob,
    downloadUrl,
    fileName: `renamed_files_${files.length}.zip`,
    fileSize: zipBlob.size,
    pageCount: files.length,
    summary: `Renamed ${files.length} file(s) and bundled into a ZIP archive.`,
    extraFiles,
  };
}

/**
 * Generates crisp test sample PNGs so all photo tools can be tested in 1 click
 */
export async function generateSamplePhotoFile(
  variant: 'portrait' | 'document' | 'studio' = 'studio'
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'document') {
    // Slightly low-contrast hazy receipt/scan ideal for Enhance & Highlight testing
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, 900, 640);
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(70, 50, 760, 540);
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText('OMINI RECEIPT & SCAN VERIFICATION', 110, 125);
    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('Document ID: #OMN-2026-8419   •   Status: Verified Original', 110, 185);
    ctx.fillText('Item 01: High-Speed Client-Side Compression .................. Free', 110, 260);
    ctx.fillText('Item 02: Algorithmic Sharpening & Auto-Levels ................ Active', 110, 315);
    ctx.fillText('Item 03: Privacy First Browser Processing .................. Enabled', 110, 370);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.strokeRect(110, 425, 680, 115);
    ctx.fillText('Authorized Stamp: 100% Free Unlimited Browser Toolkit', 140, 490);
  } else {
    // Clean solid light backdrop (#F0F9FF) + vivid central foreground card/subject for Remove BG & Crop
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(0, 0, 900, 640);

    // Central subject badge / product illustration
    ctx.fillStyle = '#24212A';
    ctx.beginPath();
    ctx.roundRect(250, 95, 400, 450, 36);
    ctx.fill();

    const grad = ctx.createLinearGradient(250, 95, 650, 545);
    grad.addColorStop(0, '#E83E8C');
    grad.addColorStop(1, '#C92B72');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(450, 250, 96, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Omini', 450, 264);

    ctx.fillStyle = '#FFE3EE';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('Studio Sample Photo', 450, 405);
    ctx.fillStyle = '#F36AA6';
    ctx.font = '18px sans-serif';
    ctx.fillText('900 × 640 px • Crisp Foreground', 450, 448);
  }

  const blob = await canvasToBlob(canvas, 'png', 0.95);
  return new File([blob], variant === 'document' ? 'Sample_Scan_Doc.png' : 'Sample_Studio_Photo.png', {
    type: 'image/png',
  });
}
