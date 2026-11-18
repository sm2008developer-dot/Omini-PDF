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
  Plus,
  Eye,
  Crop,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { ToolId } from '../types.js';
import {
  ImageOutputFormat,
  loadImageElement,
  PhotoFilterPreset,
  PhotoHighlightItem,
} from '../utils/imageEngine.js';
import {
  applyPixelAdjustmentsToBuffer,
  clampCropRect,
  computeAspectSquareCrop,
  computeRatioCanvasDimensions,
  NormalizedCropRect,
} from '../utils/imageMath.js';

interface InteractivePhotoPanelProps {
  toolId: ToolId;
  file: File;
  // Compress Photo preview metadata
  compressFormat?: ImageOutputFormat;
  compressQuality?: number;
  compressTargetKb?: number | null;
  // Resize / Ratio preview state
  resizeRatio?: string;
  resizeCustomW?: number;
  resizeCustomH?: number;
  resizeMode?: 'crop' | 'fit' | 'stretch';
  resizeBgColor?: string;
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
}

const HIGHLIGHT_COLORS = ['#FACC15', '#E83E8C', '#22C55E', '#38BDF8'];

export const InteractivePhotoPanel: React.FC<InteractivePhotoPanelProps> = ({
  toolId,
  file,
  compressFormat,
  compressQuality,
  compressTargetKb,
  resizeRatio = '1:1',
  resizeCustomW = 1080,
  resizeCustomH = 1080,
  resizeMode = 'crop',
  resizeBgColor = '#ffffff',
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgMeta, setImgMeta] = useState<{
    img: HTMLCanvasElement;
    previewCanvas: HTMLCanvasElement;
    w: number;
    h: number;
    pw: number;
    ph: number;
  } | null>(null);
  const [isDecoding, setIsDecoding] = useState(true);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [hlKind, setHlKind] = useState<'box' | 'spotlight' | 'stroke'>('box');
  const [hlColor, setHlColor] = useState('#FACC15');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(null);
  const [strokePts, setStrokePts] = useState<Array<{ x: number; y: number }>>([]);
  const [showOriginalCompare, setShowOriginalCompare] = useState(false);
  const [editViewMode, setEditViewMode] = useState<'preview' | 'crop'>('preview');

  useEffect(() => {
    setShowOriginalCompare(false);
    setEditViewMode('preview');
    setDragStart(null);
    setDragCurr(null);
    setStrokePts([]);
  }, [toolId, file]);

  // Decode uploaded image reliably via 3-tier decoder + pre-scale fast preview canvas
  useEffect(() => {
    let cancelled = false;
    setImgMeta(null);
    setDecodeError(null);
    setIsDecoding(true);

    loadImageElement(file)
      .then(({ img, width, height }) => {
        if (cancelled) return;
        const maxPreviewW = 640;
        const scale = Math.min(1, maxPreviewW / Math.max(width, height));
        const pw = Math.max(80, Math.round(width * scale));
        const ph = Math.max(60, Math.round(height * scale));
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = pw;
        previewCanvas.height = ph;
        const pctx = previewCanvas.getContext('2d', { willReadFrequently: true });
        if (pctx) {
          pctx.imageSmoothingEnabled = true;
          pctx.imageSmoothingQuality = 'high';
          pctx.drawImage(img, 0, 0, pw, ph);
        }
        setImgMeta({ img, previewCanvas, w: width, h: height, pw, ph });
        setDecodeError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setImgMeta(null);
          setDecodeError(
            err instanceof Error
              ? err.message
              : 'Could not decode this image file. Please try PNG, JPG, or WebP.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsDecoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  // Render live interactive preview onto canvas
  useEffect(() => {
    if (!imgMeta || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { previewCanvas, pw: w, ph: h } = imgMeta;

    if (toolId === 'resize-image') {
      const plan = computeRatioCanvasDimensions({
        srcW: imgMeta.w,
        srcH: imgMeta.h,
        ratio: resizeRatio,
        customWidth: resizeCustomW,
        customHeight: resizeCustomH,
        mode: resizeMode,
        maxSide: 580,
      });
      const previewScale = Math.min(1, 560 / Math.max(plan.outW, plan.outH));
      const dw = Math.max(80, Math.round(plan.outW * previewScale));
      const dh = Math.max(80, Math.round(plan.outH * previewScale));
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, dw, dh);
      if (resizeMode === 'fit') {
        ctx.fillStyle = resizeBgColor || '#ffffff';
        ctx.fillRect(0, 0, dw, dh);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        imgMeta.img,
        plan.sx,
        plan.sy,
        plan.sw,
        plan.sh,
        Math.round(plan.dx * previewScale),
        Math.round(plan.dy * previewScale),
        Math.round(plan.dw * previewScale),
        Math.round(plan.dh * previewScale)
      );
      return;
    }

    if (toolId === 'edit-photo') {
      if (editViewMode === 'crop' || showOriginalCompare) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(previewCanvas, 0, 0, w, h);
        return;
      }

      const safeCrop = clampCropRect(cropRect);
      const sx = Math.round(safeCrop.x * w);
      const sy = Math.round(safeCrop.y * h);
      const sw = Math.max(4, Math.round(safeCrop.w * w));
      const sh = Math.max(4, Math.round(safeCrop.h * h));
      const swap = rotateDeg === 90 || rotateDeg === 270;
      const dw = Math.max(60, swap ? sh : sw);
      const dh = Math.max(60, swap ? sw : sh);
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
      ctx.drawImage(previewCanvas, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (filterPreset !== 'original' || brightness !== 0 || contrast !== 0 || saturation !== 0) {
        const d = ctx.getImageData(0, 0, dw, dh);
        applyPixelAdjustmentsToBuffer(d.data, {
          preset: filterPreset,
          brightness,
          contrast,
          saturation,
        });
        ctx.putImageData(d, 0, 0);
      }
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(previewCanvas, 0, 0, w, h);

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
    resizeRatio,
    resizeCustomW,
    resizeCustomH,
    resizeMode,
    resizeBgColor,
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
    if (!imgMeta) return;

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
    if (!imgMeta) return;
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
      if (w >= 0.05 && h >= 0.05) {
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
    if (!onChangeHighlights || !imgMeta) return;
    const step = (highlights.length % 4) * 0.08;
    onChangeHighlights((prev) => [
      ...prev,
      {
        id: `ph_${Date.now()}_${prev.length}`,
        kind: hlKind === 'spotlight' ? 'spotlight' : 'box',
        color: hlColor,
        opacity: 0.38,
        rect: {
          x: Math.min(0.45, 0.14 + step * 0.6),
          y: Math.min(0.55, 0.16 + step),
          w: 0.52,
          h: 0.22,
        },
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

  return (
    <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#452035]">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-[#FF4DB8]" />
          Live Photo Studio (
          {decodeError
            ? 'Decode Error'
            : imgMeta
            ? `${imgMeta.w} × ${imgMeta.h} px`
            : 'Decoding...'}
          )
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {toolId === 'compress-image' && imgMeta && (
            <span className="px-2 py-0.5 rounded-full bg-[#35001F] border border-[#452035] text-[11px] font-bold text-[#FF4DB8]">
              {(file.size / 1024).toFixed(1)} KB →{' '}
              {compressTargetKb ? `≤ ${compressTargetKb} KB` : `${compressQuality ?? 78}%`} ({(compressFormat || 'webp').toUpperCase()})
            </span>
          )}

          {toolId === 'resize-image' && imgMeta && (
            <span className="px-2 py-0.5 rounded-full bg-[#35001F] border border-[#452035] text-[11px] font-bold text-[#FF4DB8]">
              Ratio: {resizeRatio} • {resizeMode.toUpperCase()}
            </span>
          )}

          {toolId === 'edit-photo' && onChangeCropRect && imgMeta && (
            <div className="inline-flex rounded-lg border border-[#452035] bg-[#0B0007] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setEditViewMode('preview')}
                className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                  editViewMode === 'preview' ? 'bg-[#E90083] text-white' : 'text-[#C8B8C4]'
                }`}
              >
                Live Filter View
              </button>
              <button
                type="button"
                onClick={() => setEditViewMode('crop')}
                className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer ${
                  editViewMode === 'crop' ? 'bg-[#E90083] text-white' : 'text-[#C8B8C4]'
                }`}
              >
                <Crop className="w-3 h-3" />
                Drag Crop Box
              </button>
            </div>
          )}

          {imgMeta && toolId === 'edit-photo' && editViewMode === 'preview' && (
              <button
                type="button"
                onClick={() => setShowOriginalCompare((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                  showOriginalCompare
                    ? 'bg-[#E90083] text-white border-[#FF1493]'
                    : 'bg-[#35001F] text-[#FF4DB8] border-[#452035]'
                }`}
              >
                {showOriginalCompare ? 'Showing Original' : 'Compare Original'}
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
                hlKind === 'box' ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]' : 'bg-[#0B0007] border-[#452035] text-[#C8B8C4]'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Box
            </button>
            <button
              type="button"
              onClick={() => setHlKind('spotlight')}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 cursor-pointer ${
                hlKind === 'spotlight' ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]' : 'bg-[#0B0007] border-[#452035] text-[#C8B8C4]'
              }`}
            >
              <Focus className="w-3.5 h-3.5" />
              Spotlight
            </button>
            <button
              type="button"
              onClick={() => setHlKind('stroke')}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 cursor-pointer ${
                hlKind === 'stroke' ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]' : 'bg-[#0B0007] border-[#452035] text-[#C8B8C4]'
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
                  hlColor === c ? 'border-[#FF1493] ring-2 ring-[#FF4DB8]/40 scale-110' : 'border-[#452035]'
                }`}
              />
            ))}
            <button
              type="button"
              disabled={!imgMeta}
              onClick={addQuickPhotoHighlight}
              className="px-2 py-1 rounded-lg bg-[#35001F] border border-[#452035] hover:border-[#FF1493] text-[#FF4DB8] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 ml-1"
            >
              <Plus className="w-3 h-3" />
              Quick
            </button>
            <button
              type="button"
              disabled={highlights.length === 0}
              onClick={() => onChangeHighlights((prev) => prev.slice(0, -1))}
              className="p-1 rounded-lg border border-[#452035] bg-[#0B0007] text-[#C8B8C4] hover:text-white disabled:opacity-40 cursor-pointer"
              aria-label="Undo highlight"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={highlights.length === 0}
              onClick={() => onChangeHighlights([])}
              className="p-1 rounded-lg border border-[#452035] bg-[#0B0007] text-[#D9364F] disabled:opacity-40 cursor-pointer"
              aria-label="Clear highlights"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {toolId === 'edit-photo' && editViewMode === 'crop' && (
        <p className="text-[11px] text-[#FF4DB8] font-medium">
          Drag directly across the photo below to select a custom crop area, then switch to <strong>Live Filter View</strong> or click Process.
        </p>
      )}

      {/* Checkerboard Canvas Stage */}
      <div
        className="rounded-xl p-2 sm:p-3 flex justify-center items-center min-h-[200px] overflow-auto border border-[#452035] relative"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #250819 25%, transparent 25%), linear-gradient(-45deg, #250819 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #250819 75%), linear-gradient(-45deg, transparent 75%, #250819 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          backgroundColor: '#12000A',
        }}
      >
        {isDecoding && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 bg-[#16000D]/90 rounded-xl shadow-xs border border-[#452035]">
            <Loader2 className="w-6 h-6 text-[#FF1493] animate-spin" />
            <p className="text-xs font-bold text-white">Decoding high-resolution photo...</p>
          </div>
        )}

        {!isDecoding && decodeError && (
          <div className="max-w-sm bg-[#16000D] rounded-2xl border border-[#D9364F]/50 p-4 text-center space-y-2 shadow-sm">
            <AlertCircle className="w-6 h-6 text-[#D9364F] mx-auto" />
            <p className="text-xs font-bold text-white">Could not decode image</p>
            <p className="text-[11px] text-[#C8B8C4]">{decodeError}</p>
          </div>
        )}

        {!isDecoding && !decodeError && imgMeta && (
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              data-testid="interactive-photo-canvas"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className={`block max-w-full h-auto rounded-lg shadow-sm touch-none ${
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
                  boxShadow: '0 0 0 9999px rgba(5, 0, 5, 0.55)',
                }}
                className="absolute pointer-events-none border-2 border-dashed border-[#FF1493] rounded-xs"
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
        )}
      </div>

      {toolId === 'edit-photo' && onChangeCropRect && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="font-bold text-[#91808C] mr-1">Quick Crop:</span>
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
              className="px-2 py-1 rounded-lg bg-[#0B0007] border border-[#452035] hover:border-[#FF1493] text-[#C8B8C4] hover:text-white font-semibold cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
