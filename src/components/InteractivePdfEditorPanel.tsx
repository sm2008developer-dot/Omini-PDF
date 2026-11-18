/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  Type,
  Eraser,
  Highlighter,
  Square,
  PenTool,
  Undo2,
  Trash2,
  Plus,
} from 'lucide-react';
import type { FullPdfEditItem } from '../utils/pdfConversionEngine.js';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InteractivePdfEditorPanelProps {
  file: File;
  edits: FullPdfEditItem[];
  onChangeEdits: React.Dispatch<React.SetStateAction<FullPdfEditItem[]>>;
}

const EDIT_COLORS = ['#111827', '#E83E8C', '#2563EB', '#16A34A', '#FACC15'];

export const InteractivePdfEditorPanel: React.FC<InteractivePdfEditorPanelProps> = ({
  file,
  edits,
  onChangeEdits,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [numPages, setNumPages] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [mode, setMode] = useState<'text' | 'whiteout' | 'highlight' | 'rect' | 'draw'>('text');
  const [textValue, setTextValue] = useState('Approved Copy');
  const [fontSize, setFontSize] = useState(14);
  const [fillTextBg, setFillTextBg] = useState(false);
  const [activeColor, setActiveColor] = useState('#111827');

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(null);
  const [drawPts, setDrawPts] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const loadDoc = async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) {
          doc.cleanup().catch(() => {});
          return;
        }
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (err) {
        console.warn('Edit PDF preview load error:', err);
      }
    };
    loadDoc();
    return () => {
      cancelled = true;
      pdfRef.current?.cleanup().catch(() => {});
      pdfRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    const renderPage = async () => {
      const doc = pdfRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      try {
        const page = await doc.getPage(Math.min(pageNum, doc.numPages));
        if (cancelled) return;
        const baseVp = page.getViewport({ scale: 1 });
        const targetW = 540;
        const scale = Math.min(1.6, Math.max(0.5, targetW / baseVp.width));
        const vp = page.getViewport({ scale });
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page as any).render({ canvas, viewport: vp, background: '#ffffff' }).promise;
      } catch {
        // ignore cancelled render
      }
    };
    renderPage();
    return () => {
      cancelled = true;
    };
  }, [file, pageNum, numPages]);

  const toNorm = (clientX: number, clientY: number) => {
    const el = overlayRef.current;
    if (!el) return { x: 0.1, y: 0.1 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = toNorm(e.clientX, e.clientY);
    if (mode === 'text') {
      if (!textValue.trim()) return;
      onChangeEdits((prev) => [
        ...prev,
        {
          id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex: pageNum - 1,
          kind: 'text',
          x: pt.x,
          y: pt.y,
          text: textValue.trim(),
          fontSize,
          color: activeColor,
          fillBg: fillTextBg,
        },
      ]);
      return;
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (mode === 'draw') {
      setDrawPts([pt]);
    } else {
      setDragStart(pt);
      setDragCurr(pt);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = toNorm(e.clientX, e.clientY);
    if (mode === 'draw' && drawPts.length > 0) {
      setDrawPts((prev) => [...prev, pt]);
    } else if (dragStart) {
      setDragCurr(pt);
    }
  };

  const handlePointerUp = () => {
    if (mode === 'draw' && drawPts.length > 1) {
      onChangeEdits((prev) => [
        ...prev,
        {
          id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex: pageNum - 1,
          kind: 'draw',
          color: activeColor,
          strokeWidth: 2.5,
          points: drawPts,
        },
      ]);
      setDrawPts([]);
      return;
    }

    if (dragStart && dragCurr && (mode === 'whiteout' || mode === 'highlight' || mode === 'rect')) {
      const x = Math.min(dragStart.x, dragCurr.x);
      const y = Math.min(dragStart.y, dragCurr.y);
      const w = Math.abs(dragCurr.x - dragStart.x);
      const h = Math.abs(dragCurr.y - dragStart.y);
      onChangeEdits((prev) => [
        ...prev,
        {
          id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex: pageNum - 1,
          kind: mode,
          x: Math.min(0.95, x),
          y: Math.min(0.95, y),
          w: Math.min(1 - x, w < 0.03 ? 0.28 : w),
          h: Math.min(1 - y, h < 0.02 ? 0.05 : h),
          color: mode === 'highlight' && activeColor === '#111827' ? '#FACC15' : activeColor,
        },
      ]);
      setDragStart(null);
      setDragCurr(null);
    }
  };

  const addQuickEdit = () => {
    const pageCountEdits = edits.filter((e) => e.pageIndex === pageNum - 1).length;
    const offset = (pageCountEdits % 5) * 0.08;
    if (mode === 'text') {
      onChangeEdits((prev) => [
        ...prev,
        {
          id: `ed_${Date.now()}_${prev.length}`,
          pageIndex: pageNum - 1,
          kind: 'text',
          x: 0.12,
          y: Math.min(0.85, 0.16 + offset),
          text: textValue.trim() || 'Edited Text',
          fontSize,
          color: activeColor,
          fillBg: fillTextBg,
        },
      ]);
      return;
    }
    if (mode === 'draw') {
      onChangeEdits((prev) => [
        ...prev,
        {
          id: `ed_${Date.now()}_${prev.length}`,
          pageIndex: pageNum - 1,
          kind: 'draw',
          color: activeColor,
          strokeWidth: 2.5,
          points: [
            { x: 0.15, y: 0.25 + offset },
            { x: 0.35, y: 0.22 + offset },
            { x: 0.52, y: 0.26 + offset },
          ],
        },
      ]);
      return;
    }
    onChangeEdits((prev) => [
      ...prev,
      {
        id: `ed_${Date.now()}_${prev.length}`,
        pageIndex: pageNum - 1,
        kind: mode,
        x: 0.12,
        y: Math.min(0.84, 0.18 + offset),
        w: 0.45,
        h: mode === 'rect' ? 0.14 : 0.055,
        color: mode === 'highlight' && activeColor === '#111827' ? '#FACC15' : activeColor,
      },
    ]);
  };

  const pageEdits = edits.filter((e) => e.pageIndex === pageNum - 1);

  return (
    <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-4 space-y-3">
      {/* Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#452035]">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'text' as const, label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
            { id: 'whiteout' as const, label: 'Whiteout', icon: <Eraser className="w-3.5 h-3.5" /> },
            { id: 'highlight' as const, label: 'Highlight', icon: <Highlighter className="w-3.5 h-3.5" /> },
            { id: 'rect' as const, label: 'Box', icon: <Square className="w-3.5 h-3.5" /> },
            { id: 'draw' as const, label: 'Draw', icon: <PenTool className="w-3.5 h-3.5" /> },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setMode(btn.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border transition-colors ${
                mode === btn.id
                  ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]'
                  : 'bg-[#0B0007] border-[#452035] text-[#C8B8C4] hover:text-white'
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {EDIT_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setActiveColor(hex)}
              style={{ backgroundColor: hex }}
              aria-label={`Select color ${hex}`}
              className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                activeColor === hex ? 'border-[#FF1493] ring-2 ring-[#FF4DB8]/40 scale-110' : 'border-[#452035]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Text mode controls */}
      {mode === 'text' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type text to stamp onto PDF page..."
            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-[#452035] bg-[#12000A] text-white placeholder-[#91808C] focus:outline-hidden focus:border-[#FF1493]"
          />
          <select
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="px-2 py-1.5 rounded-xl border border-[#452035] bg-[#12000A] text-white font-semibold focus:outline-hidden focus:border-[#FF1493]"
            aria-label="Font size"
          >
            {[10, 12, 14, 18, 22, 28].map((sz) => (
              <option key={sz} value={sz}>
                {sz}pt
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#452035] bg-[#0B0007] cursor-pointer font-semibold text-[#C8B8C4]">
            <input
              type="checkbox"
              checked={fillTextBg}
              onChange={(e) => setFillTextBg(e.target.checked)}
              className="accent-[#FF1493]"
            />
            <span>White BG</span>
          </label>
        </div>
      )}

      {/* Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[#C8B8C4]">
          {mode === 'text'
            ? 'Tap anywhere on the page to add text.'
            : mode === 'draw'
            ? 'Drag to sketch freehand on the page.'
            : 'Drag across the page to place area.'}{' '}
          ({edits.length} edit{edits.length === 1 ? '' : 's'})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addQuickEdit}
            className="px-2.5 py-1 rounded-lg bg-[#35001F] border border-[#452035] hover:border-[#FF1493] text-[#FF4DB8] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Stamp</span>
          </button>
          <button
            type="button"
            disabled={edits.length === 0}
            onClick={() => onChangeEdits((prev) => prev.slice(0, -1))}
            className="px-2 py-1 rounded-lg border border-[#452035] bg-[#0B0007] text-[#C8B8C4] hover:text-white disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={edits.length === 0}
            onClick={() => onChangeEdits([])}
            className="px-2 py-1 rounded-lg border border-[#452035] bg-[#0B0007] text-[#D9364F] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Pagination */}
      {numPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0B0007] rounded-xl border border-[#452035] text-xs">
          <button
            type="button"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded-lg bg-[#16000D] border border-[#452035] text-white font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="font-bold text-white">
            Page {pageNum} of {numPages}
          </span>
          <button
            type="button"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            className="px-2 py-1 rounded-lg bg-[#16000D] border border-[#452035] text-white font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Canvas Surface */}
      <div className="overflow-auto bg-[#0B0007] border border-[#452035] rounded-xl p-2 sm:p-3 flex justify-center">
        <div
          ref={overlayRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative inline-block shadow-md rounded border border-[#452035] bg-white select-none touch-none cursor-crosshair"
        >
          <canvas ref={canvasRef} className="block max-w-full h-auto" />

          {/* Overlay preview SVG for freehand strokes */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {pageEdits
              .filter((e) => e.kind === 'draw' && e.points && e.points.length > 1)
              .map((e) => (
                <polyline
                  key={e.id}
                  fill="none"
                  stroke={e.color || '#111827'}
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={e.points!.map((p) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ')}
                />
              ))}
            {drawPts.length > 1 && (
              <polyline
                fill="none"
                stroke={activeColor}
                strokeWidth="0.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={drawPts.map((p) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ')}
              />
            )}
          </svg>

          {/* Overlay HTML previews for text, whiteout, highlight, rect */}
          {pageEdits.map((ed) => {
            if (ed.kind === 'whiteout') {
              return (
                <div
                  key={ed.id}
                  style={{
                    left: `${(ed.x ?? 0) * 100}%`,
                    top: `${(ed.y ?? 0) * 100}%`,
                    width: `${(ed.w ?? 0.2) * 100}%`,
                    height: `${(ed.h ?? 0.05) * 100}%`,
                  }}
                  className="absolute pointer-events-none bg-white border border-dashed border-slate-400"
                />
              );
            }
            if (ed.kind === 'highlight') {
              return (
                <div
                  key={ed.id}
                  style={{
                    left: `${(ed.x ?? 0) * 100}%`,
                    top: `${(ed.y ?? 0) * 100}%`,
                    width: `${(ed.w ?? 0.3) * 100}%`,
                    height: `${(ed.h ?? 0.05) * 100}%`,
                    backgroundColor: ed.color || '#FACC15',
                    opacity: 0.38,
                  }}
                  className="absolute pointer-events-none rounded-xs"
                />
              );
            }
            if (ed.kind === 'rect') {
              return (
                <div
                  key={ed.id}
                  style={{
                    left: `${(ed.x ?? 0) * 100}%`,
                    top: `${(ed.y ?? 0) * 100}%`,
                    width: `${(ed.w ?? 0.25) * 100}%`,
                    height: `${(ed.h ?? 0.12) * 100}%`,
                    borderColor: ed.color || '#E83E8C',
                  }}
                  className="absolute pointer-events-none border-2"
                />
              );
            }
            if (ed.kind === 'text') {
              return (
                <div
                  key={ed.id}
                  style={{
                    left: `${(ed.x ?? 0) * 100}%`,
                    top: `${(ed.y ?? 0) * 100}%`,
                    color: ed.color || '#111827',
                    fontSize: `${Math.max(10, Math.round((ed.fontSize || 14) * 0.85))}px`,
                    backgroundColor: ed.fillBg ? '#FFFFFF' : 'transparent',
                  }}
                  className="absolute pointer-events-none font-bold px-1 -translate-y-1/2 whitespace-nowrap border border-dashed border-[#E83E8C]/40"
                >
                  {ed.text}
                </div>
              );
            }
            return null;
          })}

          {dragStart && dragCurr && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurr.x) * 100}%`,
                top: `${Math.min(dragStart.y, dragCurr.y) * 100}%`,
                width: `${Math.abs(dragCurr.x - dragStart.x) * 100}%`,
                height: `${Math.abs(dragCurr.y - dragStart.y) * 100}%`,
                backgroundColor: mode === 'whiteout' ? 'rgba(255,255,255,0.85)' : mode === 'highlight' ? `${activeColor}55` : 'transparent',
                borderColor: activeColor,
              }}
              className="absolute pointer-events-none border-2 border-dashed"
            />
          )}
        </div>
      </div>
    </div>
  );
};
