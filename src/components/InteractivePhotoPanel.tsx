/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Highlighter,
  Focus,
  Square,
  Undo2,
  Trash2,
  Pipette,
  RotateCcw,
  Plus,
  Eye,
  Crop,
} from 'lucide-react';
import type { ToolId } from '../types.js';
import {
  loadImageElement,
  PhotoFilterPreset,
  PhotoHighlightItem,
} from '../utils/imageEngine.js';
import {
  applyPixelAdjustmentsToBuffer,
  clampCropRect,
  computeAspectSquareCrop,
  NormalizedCropRect,
  processBackgroundRemovalPixels,
  RgbColor,
} from '../utils/imageMath.js';

interface InteractivePhotoPanelProps {
  toolId: ToolId;
  file: File;
  // Edit Photo state
  cropRect?: NormalizedCropRect;
  onChangeCropRect?: (rect: NormalizedCropRect) => void;
  rotateDeg?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  filterPreset?: PhotoFilterPreset;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  // Highlight Photo state
  highlights?: PhotoHighlightItem[];
  onChangeHighlights?: React.Dispatch<React.SetStateAction<PhotoHighlightItem[]>>;
  // Remove BG state
  bgTolerance?: number;
  bgFeather?: number;
  bgMode?: 'flood-edges' | 'global-color';
  bgSampleColor?: RgbColor | null;
  onPickSampleColor?: (c: RgbColor | null) => void;
  bgFill?: 'transparent' | string;
  // Enhance Photo state
  enhancePreset?: 'auto' | 'document' | 'portrait' | 'vivid' | 'custom';
  enhanceSharpen?: number;
  enhanceContrast?: number;
  enhanceBrightness?: number;
  enhanceVibrance?: number;
}

const HIGHLIGHT_COLORS = ['#FACC15', '#E83E8C', '#22C55E', '#38BDF8'];

export const InteractivePhotoPanel: React.FC<InteractivePhotoPanelProps> = ({
  toolId,
  file,
  cropRect = { x: 0, y: 0, w: 1, h: 1 },
  onChangeCropRect,
  rotateDeg = 0,
  flipH = false,
  flipV = false,
  filterPreset = 'original',
  brightness = 0,
  contrast = 0,
  saturation = 0,
  highlights = [],
  onChangeHighlights,
  bgTolerance = 42,
  bgFeather = 12,
  bgMode = 'flood-edges',
  bgSampleColor = null,
  onPickSampleColor,
  bgFill = 'transparent',
  enhancePreset = 'auto',
  enhanceSharpen = 55,
  enhanceContrast = 65,
  enhanceBrightness = 4,
  enhanceVibrance = 35,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgMeta, setImgMeta] = useState<{ img: HTMLImageElement; w: number; h: number } | null>(null);
  const [hlKind, setHlKind] = useState<'box' | 'spotlight' | 'stroke'>('box');
  const [hlColor, setHlColor] = useState('#FACC15');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(null);
  const [strokePts, setStrokePts] = useState<Array<{ x: number; y: number }>>([]);
  const [showOriginalCompare, setShowOriginalCompare] = useState(false);
  const [editViewMode, setEditViewMode] = useState<'preview' | 'crop'>('preview');
  const [detectedBgSwatch, setDetectedBgSwatch] = useState<RgbColor | null>(null);

  useEffect(() => {
    setShowOriginalCompare(false);
    setEditViewMode('preview');
    setDragStart(null);
    setDragCurr(null);
    setStrokePts([]);
  }, [toolId, file]);

  // Load decoded HTMLImageElement whenever file changes
  useEffect(() => {
    let cancelled = false;
    loadImageElement(file)
      .then(({ img, width, height }) => {
        if (!cancelled) setImgMeta({ img, w: width, h: height });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Render live interactive preview onto scaled canvas
  useEffect(() => {
    if (!imgMeta || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const maxPreviewW = 620;
    const scale = Math.min(1, maxPreviewW / imgMeta.w);
    const w = Math.max(120, Math.round(imgMeta.w * scale));
    const h = Math.max(90, Math.round(imgMeta.h * scale));

    if (toolId === 'edit-photo') {
      if (editViewMode === 'crop') {
        // Show full source frame for interactive drag-to-crop selection
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(imgMeta.img, 0, 0, w, h);
        return;
      }

      if (showOriginalCompare) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(imgMeta.img, 0, 0, w, h);
        return;
      }

      const safeCrop = clampCropRect(cropRect);
      const sx = Math.round(safeCrop.x * imgMeta.w);
      const sy = Math.round(safeCrop.y * imgMeta.h);
      const sw = Math.max(4, Math.round(safeCrop.w * imgMeta.w));
      const sh = Math.max(4, Math.round(safeCrop.h * imgMeta.h));
      const swap = rotateDeg === 90 || rotateDeg === 270;
      const outScale = Math.min(1, maxPreviewW / Math.max(sw, sh));
      const dw = Math.max(80, Math.round((swap ? sh : sw) * outScale));
      const dh = Math.max(80, Math.round((swap ? sw : sh) * outScale));
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.save();
      ctx.translate(dw / 2, dh / 2);
      ctx.rotate((rotateDeg * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      const drawW = swap ? dh : dw;
      const drawH = swap ? dw : dh;
      ctx.drawImage(imgMeta.img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (filterPreset !== 'original' || brightness !== 0 || contrast !== 0 || saturation !== 0) {
        const d = ctx.getImageData(0, 0, dw, dh);
        applyPixelAdjustmentsToBuffer(d.data, { preset: filterPreset, brightness, contrast, saturation });
        ctx.putImageData(d, 0, 0);
      }
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(imgMeta.img, 0, 0, w, h);

    if (toolId === 'remove-bg') {
      const d = ctx.getImageData(0, 0, w, h);
      const { samplesUsed } = processBackgroundRemovalPixels(d.data, w, h, {
        tolerance: bgTolerance,
        feather: bgFeather,
        mode: bgMode,
        sampleColor: bgSampleColor,
      });
      if (samplesUsed.length > 0) {
        setDetectedBgSwatch(samplesUsed[0]);
      }

      if (!showOriginalCompare) {
        ctx.putImageData(d, 0, 0);
        if (bgFill && bgFill !== 'transparent') {
          const tmp = document.createElement('canvas');
          tmp.width = w;
          tmp.height = h;
          tmp.getContext('2d')!.drawImage(canvas, 0, 0);
          ctx.fillStyle = bgFill;
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(tmp, 0, 0);
        }
      }
    }

    if (toolId === 'enhance-photo' && !showOriginalCompare) {
      const d = ctx.getImageData(0, 0, w, h);
      applyPixelAdjustmentsToBuffer(d.data, {
        brightness: enhanceBrightness,
        contrast: Math.round(enhanceContrast * 0.45),
        saturation: Math.round(enhanceVibrance * 0.65),
        preset: enhancePreset === 'vivid' ? 'vivid' : 'original',
      });
      if (enhanceSharpen > 10) {
        const s = new Uint8ClampedArray(d.data);
        const weight = (enhanceSharpen / 100) * 0.55;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const lap =
                4 * s[idx + c] - s[idx - 4 + c] - s[idx + 4 + c] - s[idx - w * 4 + c] - s[idx + w * 4 + c];
              d.data[idx + c] = Math.max(0, Math.min(255, s[idx + c] + lap * weight));
            }
          }
        }
      }
      ctx.putImageData(d, 0, 0);
    }

    if (toolId === 'highlight-photo') {
      const renderItems =
        strokePts.length > 1
          ? [
              ...highlights,
              {
                id: 'live_stroke',
                kind: 'stroke' as const,
                color: hlColor,
                opacity: 0.45,
                points: strokePts,
              },
            ]
          : highlights;

      const spotlights = renderItems.filter((a) => a.kind === 'spotlight' && a.rect);
      if (spotlights.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        for (const s of spotlights) {
          const r = clampCropRect(s.rect!);
          ctx.rect(r.x * w, r.y * h, r.w * w, r.h * h);
        }
        ctx.fill('evenodd');
        for (const s of spotlights) {
          const r = clampCropRect(s.rect!);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 3;
          ctx.strokeRect(r.x * w, r.y * h, r.w * w, r.h * h);
        }
        ctx.restore();
      }
      for (const a of renderItems) {
        if (a.kind === 'box' && a.rect) {
          const r = clampCropRect(a.rect);
          ctx.save();
          ctx.globalAlpha = a.opacity ?? 0.35;
          ctx.fillStyle = a.color;
          ctx.fillRect(r.x * w, r.y * h, r.w * w, r.h * h);
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x * w, r.y * h, r.w * w, r.h * h);
          ctx.restore();
        } else if (a.kind === 'stroke' && a.points && a.points.length > 1) {
          ctx.save();
          ctx.globalAlpha = a.opacity ?? 0.45;
          ctx.strokeStyle = a.color;
          ctx.lineWidth = Math.max(10, 24 * (w / 800));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(a.points[0].x * w, a.points[0].y * h);
          for (let i = 1; i < a.points.length; i++) {
            ctx.lineTo(a.points[i].x * w, a.points[i].y * h);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [
    imgMeta,
    toolId,
    editViewMode,
    cropRect,
    rotateDeg,
    flipH,
    flipV,
    filterPreset,
    brightness,
    contrast,
    saturation,
    highlights,
    strokePts,
    hlColor,
    bgTolerance,
    bgFeather,
    bgMode,
    bgSampleColor,
    bgFill,
    enhancePreset,
    enhanceSharpen,
    enhanceContrast,
    enhanceBrightness,
    enhanceVibrance,
    showOriginalCompare,
  ]);

  const toNorm = (clientX: number, clientY: number) => {
    const c = canvasRef.current;
    if (!c) return { x: 0.5, y: 0.5 };
    const rect = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (toolId === 'remove-bg' && onPickSampleColor && imgMeta) {
      const pt = toNorm(e.clientX, e.clientY);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgMeta.w;
      tempCanvas.height = imgMeta.h;
      const tctx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
      tctx.drawImage(imgMeta.img, 0, 0);
      const px = tctx.getImageData(
        Math.min(imgMeta.w - 1, Math.floor(pt.x * imgMeta.w)),
        Math.min(imgMeta.h - 1, Math.floor(pt.y * imgMeta.h)),
        1,
        1
      ).data;
      onPickSampleColor({ r: px[0], g: px[1], b: px[2] });
      return;
    }

    if (toolId === 'edit-photo' && editViewMode === 'crop' && onChangeCropRect) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const pt = toNorm(e.clientX, e.clientY);
      setDragStart(pt);
      setDragCurr(pt);
      return;
    }

    if (toolId === 'highlight-photo' && onChangeHighlights) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const pt = toNorm(e.clientX, e.clientY);
      if (hlKind === 'stroke') {
        setStrokePts([pt]);
      } else {
        setDragStart(pt);
        setDragCurr(pt);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (toolId === 'edit-photo' && editViewMode === 'crop' && dragStart) {
      setDragCurr(toNorm(e.clientX, e.clientY));
      return;
    }
    if (toolId !== 'highlight-photo') return;
    const pt = toNorm(e.clientX, e.clientY);
    if (hlKind === 'stroke' && strokePts.length > 0) {
      setStrokePts((prev) => [...prev, pt]);
    } else if (dragStart) {
      setDragCurr(pt);
    }
  };

  const handleCanvasPointerUp = () => {
    if (toolId === 'edit-photo' && editViewMode === 'crop' && dragStart && dragCurr && onChangeCropRect) {
      const x = Math.min(dragStart.x, dragCurr.x);
      const y = Math.min(dragStart.y, dragCurr.y);
      const w = Math.abs(dragCurr.x - dragStart.x);
      const h = Math.abs(dragCurr.y - dragStart.y);
      if (w >= 0.06 && h >= 0.06) {
        onChangeCropRect(clampCropRect({ x, y, w, h }));
      }
      setDragStart(null);
      setDragCurr(null);
      return;
    }

    if (toolId !== 'highlight-photo' || !onChangeHighlights) return;
    if (hlKind === 'stroke' && strokePts.length > 1) {
      onChangeHighlights((prev) => [
        ...prev,
        {
          id: `ph_${Date.now()}`,
          kind: 'stroke',
          color: hlColor,
          opacity: 0.45,
          lineWidth: 24,
          points: strokePts,
        },
      ]);
      setStrokePts([]);
      return;
    }
    if (dragStart && dragCurr) {
      const x = Math.min(dragStart.x, dragCurr.x);
      const y = Math.min(dragStart.y, dragCurr.y);
      const w = Math.abs(dragCurr.x - dragStart.x);
      const h = Math.abs(dragCurr.y - dragStart.y);
      onChangeHighlights((prev) => [
        ...prev,
        {
          id: `ph_${Date.now()}`,
          kind: hlKind === 'spotlight' ? 'spotlight' : 'box',
          color: hlColor,
          opacity: 0.35,
          rect: {
            x: Math.min(0.85, x),
            y: Math.min(0.85, y),
            w: w < 0.03 ? 0.35 : w,
            h: h < 0.03 ? 0.2 : h,
          },
        },
      ]);
      setDragStart(null);
      setDragCurr(null);
    }
  };

  const addQuickPhotoHighlight = () => {
    if (!onChangeHighlights) return;
    onChangeHighlights((prev) => [
      ...prev,
      {
        id: `ph_${Date.now()}`,
        kind: hlKind === 'spotlight' ? 'spotlight' : 'box',
        color: hlColor,
        opacity: 0.36,
        rect: { x: 0.2, y: 0.25, w: 0.6, h: 0.42 },
      },
    ]);
  };

  const activeCropBox =
    toolId === 'edit-photo' && editViewMode === 'crop'
      ? dragStart && dragCurr
        ? {
            x: Math.min(dragStart.x, dragCurr.x),
            y: Math.min(dragStart.y, dragCurr.y),
            w: Math.max(0.02, Math.abs(dragCurr.x - dragStart.x)),
            h: Math.max(0.02, Math.abs(dragCurr.y - dragStart.y)),
          }
        : clampCropRect(cropRect)
      : null;

  const activeSwatch = bgSampleColor || detectedBgSwatch;

  return (
    <div className="bg-white rounded-2xl border border-[#FFE3EE] p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#FFF4F8]">
        <span className="text-xs font-bold text-[#24212A] flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-[#E83E8C]" />
          Live Interactive Photo Studio ({imgMeta ? `${imgMeta.w} × ${imgMeta.h} px` : 'Loading...'})
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {toolId === 'edit-photo' && onChangeCropRect && (
            <div className="inline-flex rounded-lg border border-[#FFE3EE] bg-[#FFF4F8] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setEditViewMode('preview')}
                className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                  editViewMode === 'preview' ? 'bg-white text-[#C92B72] shadow-2xs' : 'text-[#77717B]'
                }`}
              >
                Live Filter View
              </button>
              <button
                type="button"
                onClick={() => setEditViewMode('crop')}
                className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer ${
                  editViewMode === 'crop' ? 'bg-white text-[#C92B72] shadow-2xs' : 'text-[#77717B]'
                }`}
              >
                <Crop className="w-3 h-3" />
                Drag Crop Box
              </button>
            </div>
          )}

          {(toolId === 'remove-bg' || toolId === 'enhance-photo' || (toolId === 'edit-photo' && editViewMode === 'preview')) && (
            <button
              type="button"
              onClick={() => setShowOriginalCompare((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                showOriginalCompare
                  ? 'bg-[#24212A] text-white border-[#24212A]'
                  : 'bg-[#FFF4F8] text-[#C92B72] border-[#FDC6DD]'
              }`}
            >
              {showOriginalCompare ? 'Showing Original' : 'Compare Original'}
            </button>
          )}

          {toolId === 'remove-bg' && onPickSampleColor && bgSampleColor && (
            <button
              type="button"
              onClick={() => onPickSampleColor(null)}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Eyedropper
            </button>
          )}
        </div>
      </div>

      {toolId === 'highlight-photo' && onChangeHighlights && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHlKind('box')}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 cursor-pointer ${
                hlKind === 'box' ? 'bg-[#FFE3EE] border-[#E83E8C] text-[#C92B72]' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Box
            </button>
            <button
              type="button"
              onClick={() => setHlKind('spotlight')}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 cursor-pointer ${
                hlKind === 'spotlight' ? 'bg-[#FFE3EE] border-[#E83E8C] text-[#C92B72]' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Focus className="w-3.5 h-3.5" />
              Spotlight
            </button>
            <button
              type="button"
              onClick={() => setHlKind('stroke')}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 cursor-pointer ${
                hlKind === 'stroke' ? 'bg-[#FFE3EE] border-[#E83E8C] text-[#C92B72]' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              Marker
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setHlColor(c)}
                style={{ backgroundColor: c }}
                aria-label={`Highlight color ${c}`}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                  hlColor === c ? 'border-[#24212A] scale-110' : 'border-white shadow-xs'
                }`}
              />
            ))}
            <button
              type="button"
              onClick={addQuickPhotoHighlight}
              className="px-2 py-1 rounded-lg bg-[#FFF4F8] border border-[#FDC6DD] text-[#C92B72] font-bold flex items-center gap-1 cursor-pointer ml-1"
            >
              <Plus className="w-3 h-3" />
              Quick
            </button>
            <button
              type="button"
              disabled={highlights.length === 0}
              onClick={() => onChangeHighlights((prev) => prev.slice(0, -1))}
              className="p-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              aria-label="Undo highlight"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={highlights.length === 0}
              onClick={() => onChangeHighlights([])}
              className="p-1 rounded-lg border border-slate-200 text-[#D9364F] disabled:opacity-40 cursor-pointer"
              aria-label="Clear highlights"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {toolId === 'remove-bg' && (
        <div className="text-[11px] text-[#77717B] flex flex-wrap items-center gap-2">
          <Pipette className="w-3.5 h-3.5 text-[#E83E8C] shrink-0" />
          {activeSwatch && (
            <span
              className="inline-block w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
              style={{ backgroundColor: `rgb(${activeSwatch.r}, ${activeSwatch.g}, ${activeSwatch.b})` }}
              title={`Target RGB(${activeSwatch.r}, ${activeSwatch.g}, ${activeSwatch.b})`}
            />
          )}
          <span>
            {bgSampleColor
              ? `Eyedropper target RGB(${bgSampleColor.r}, ${bgSampleColor.g}, ${bgSampleColor.b}) — click another background area if needed.`
              : 'Auto edge cluster detection active — click any background area to pick an exact color.'}
          </span>
        </div>
      )}

      {toolId === 'edit-photo' && editViewMode === 'crop' && (
        <p className="text-[11px] text-[#C92B72] font-medium">
          Drag directly across the photo below to select a custom crop area, then switch to <strong>Live Filter View</strong> or click Process.
        </p>
      )}

      {/* Checkerboard Canvas Stage */}
      <div
        className="rounded-xl p-2 sm:p-3 flex justify-center overflow-auto border border-slate-200 relative"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          backgroundColor: '#ffffff',
        }}
      >
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            data-testid="interactive-photo-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className={`block max-w-full h-auto rounded-lg shadow-sm touch-none ${
              toolId === 'remove-bg' ||
              toolId === 'highlight-photo' ||
              (toolId === 'edit-photo' && editViewMode === 'crop')
                ? 'cursor-crosshair'
                : ''
            }`}
          />

          {activeCropBox && (
            <div
              style={{
                left: `${activeCropBox.x * 100}%`,
                top: `${activeCropBox.y * 100}%`,
                width: `${activeCropBox.w * 100}%`,
                height: `${activeCropBox.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
              }}
              className="absolute pointer-events-none border-2 border-dashed border-[#E83E8C] rounded-xs"
            />
          )}

          {toolId === 'highlight-photo' && dragStart && dragCurr && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurr.x) * 100}%`,
                top: `${Math.min(dragStart.y, dragCurr.y) * 100}%`,
                width: `${Math.abs(dragCurr.x - dragStart.x) * 100}%`,
                height: `${Math.abs(dragCurr.y - dragStart.y) * 100}%`,
                borderColor: hlColor,
              }}
              className="absolute pointer-events-none border-2 border-dashed bg-white/15"
            />
          )}
        </div>
      </div>

      {toolId === 'edit-photo' && onChangeCropRect && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="font-bold text-[#77717B] mr-1">Quick Crop:</span>
          {[
            { label: 'Full (100%)', rect: { x: 0, y: 0, w: 1, h: 1 } },
            { label: 'Center 80%', rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } },
            {
              label: 'Square 1:1',
              rect: imgMeta ? computeAspectSquareCrop(imgMeta.w, imgMeta.h) : { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
            },
            { label: 'Tight 60%', rect: { x: 0.2, y: 0.2, w: 0.6, h: 0.6 } },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChangeCropRect(preset.rect)}
              className="px-2 py-1 rounded-lg bg-[#FFF4F8] border border-[#FFE3EE] hover:border-[#E83E8C] text-[#24212A] font-semibold cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
