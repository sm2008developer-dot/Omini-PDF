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
  PhotoFilterPresetMath,
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

function rasterSourceToSafeCanvas(
  source: CanvasImageSource,
  rawWidth: number,
  rawHeight: number,
  maxSide = 4096
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcW = Math.max(1, Math.round(rawWidth));
  const srcH = Math.max(1, Math.round(rawHeight));
  const scale = Math.max(srcW, srcH) > maxSide ? maxSide / Math.max(srcW, srcH) : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is not available.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader did not return data URL.'));
    };
    reader.onerror = () => reject(new Error('Failed reading image bytes.'));
    reader.readAsDataURL(file);
  });
}

async function decodeViaHtmlImage(srcUrl: string): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('HTMLImageElement failed decoding image.'));
    img.src = srcUrl;
  });
  if (typeof img.decode === 'function') {
    try {
      await img.decode();
    } catch {
      // Some SVG/PNG streams resolve onload cleanly even if decode() rejects; drawImage still works if naturalWidth > 0
    }
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) {
    throw new Error('Decoded image has zero dimensions.');
  }
  return rasterSourceToSafeCanvas(img, w, h);
}

/**
 * Bulletproof 3-tier client-side image decoder returning an in-memory HTMLCanvasElement:
 * Tier 1: createImageBitmap (handles EXIF orientation & huge mobile photos without blob URL races)
 * Tier 2: HTMLImageElement via ObjectURL & FileReader DataURL (rasterized BEFORE revoking URL)
 * Tier 3: Pure-JS UPNG.decode fallback (handles 16-bit/unusual PNGs that native Chromium rejects)
 */
export async function loadImageElement(file: File | Blob): Promise<{
  img: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  // Tier 1: createImageBitmap
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        const res = rasterSourceToSafeCanvas(bitmap, bitmap.width, bitmap.height);
        return { img: res.canvas, width: res.width, height: res.height };
      }
    } catch {
      // Fall through to Tier 2
    } finally {
      try {
        bitmap?.close();
      } catch {
        // ignore
      }
    }
  }

  // Tier 2a: ObjectURL + decode + immediate canvas copy before revoke
  const url = URL.createObjectURL(file);
  try {
    const res = await decodeViaHtmlImage(url);
    return { img: res.canvas, width: res.width, height: res.height };
  } catch {
    // Fall through
  } finally {
    URL.revokeObjectURL(url);
  }

  // Tier 2b: FileReader DataURL (helps on mobile WebView/Android content:// blobs)
  try {
    const dataUrl = await fileToDataUrl(file);
    const res = await decodeViaHtmlImage(dataUrl);
    return { img: res.canvas, width: res.width, height: res.height };
  } catch {
    // Fall through to Tier 3
  }

  // Tier 3: Pure-JS PNG decoder (UPNG) for tricky/16-bit/non-standard PNGs
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isPngSig =
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    if (isPngSig) {
      const decoded = UPNG.decode(buf);
      const frames = UPNG.toRGBA8(decoded);
      if (frames && frames.length > 0 && decoded.width > 0 && decoded.height > 0) {
        const rgba = new Uint8ClampedArray(frames[0]);
        const tmp = document.createElement('canvas');
        tmp.width = decoded.width;
        tmp.height = decoded.height;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        if (tctx) {
          tctx.putImageData(new ImageData(rgba, decoded.width, decoded.height), 0, 0);
          const safe = rasterSourceToSafeCanvas(tmp, decoded.width, decoded.height);
          return { img: safe.canvas, width: safe.width, height: safe.height };
        }
      }
    }
  } catch {
    // Fall through to descriptive error
  }

  throw new Error(
    'Unable to decode this image file. It may be HEIC/RAW or corrupted — please try a standard PNG, JPG, or WebP photo.'
  );
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
export type PhotoFilterPreset = PhotoFilterPresetMath;

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
