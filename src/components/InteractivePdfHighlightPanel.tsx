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
  Highlighter,
  Type,
  Undo2,
  Trash2,
  Plus,
} from 'lucide-react';
import type { PdfAnnotation } from '../utils/pdfEngine.js';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InteractivePdfHighlightPanelProps {
  file: File;
  annotations: PdfAnnotation[];
  onChangeAnnotations: React.Dispatch<React.SetStateAction<PdfAnnotation[]>>;
}

const COLORS = [
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Pink', hex: '#E83E8C' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Cyan', hex: '#06B6D4' },
];

export const InteractivePdfHighlightPanel: React.FC<InteractivePdfHighlightPanelProps> = ({
  file,
  annotations,
  onChangeAnnotations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [numPages, setNumPages] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [mode, setMode] = useState<'highlight' | 'note'>('highlight');
  const [activeColor, setActiveColor] = useState('#FACC15');
  const [noteText, setNoteText] = useState('Important Section');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(null);

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
        console.warn('PDF highlight preview load error:', err);
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

  const toNormCoords = (clientX: number, clientY: number) => {
    const el = overlayRef.current;
    if (!el) return { x: 0.1, y: 0.1 };
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = toNormCoords(e.clientX, e.clientY);
    if (mode === 'note') {
      if (!noteText.trim()) return;
      onChangeAnnotations((prev) => [
        ...prev,
        {
          id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex: pageNum - 1,
          kind: 'note',
          x: pt.x,
          y: pt.y,
          w: 0.25,
          h: 0.04,
          color: activeColor,
          text: noteText.trim(),
        },
      ]);
      return;
    }
    setDragStart(pt);
    setDragCurr(pt);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setDragCurr(toNormCoords(e.clientX, e.clientY));
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurr) return;
    const x = Math.min(dragStart.x, dragCurr.x);
    const y = Math.min(dragStart.y, dragCurr.y);
    const w = Math.abs(dragCurr.x - dragStart.x);
    const h = Math.abs(dragCurr.y - dragStart.y);

    // If user tapped instead of dragging, create a neat default highlight bar
    const finalW = w < 0.025 ? 0.36 : w;
    const finalH = h < 0.015 ? 0.045 : h;

    onChangeAnnotations((prev) => [
      ...prev,
      {
        id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pageIndex: pageNum - 1,
        kind: 'highlight',
        x: Math.min(0.95, x),
        y: Math.min(0.95, y),
        w: Math.min(1 - x, finalW),
        h: Math.min(1 - y, finalH),
        color: activeColor,
        opacity: 0.38,
      },
    ]);
    setDragStart(null);
    setDragCurr(null);
  };

  const addQuickHighlight = () => {
    const offset = (annotations.filter((a) => a.pageIndex === pageNum - 1).length % 5) * 0.08;
    onChangeAnnotations((prev) => [
      ...prev,
      {
        id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pageIndex: pageNum - 1,
        kind: mode,
        x: 0.1,
        y: Math.min(0.85, 0.14 + offset),
        w: 0.65,
        h: 0.055,
        color: activeColor,
        opacity: 0.4,
        text: mode === 'note' ? noteText.trim() || 'Highlighted Note' : undefined,
      },
    ]);
  };

  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageNum - 1);

  return (
    <div className="bg-white rounded-2xl border border-[#FFE3EE] p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#FFF4F8]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('highlight')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border ${
              mode === 'highlight'
                ? 'bg-[#FFE3EE] border-[#E83E8C] text-[#C92B72]'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlight Box</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('note')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border ${
              mode === 'note'
                ? 'bg-[#FFE3EE] border-[#E83E8C] text-[#C92B72]'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Note</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setActiveColor(c.hex)}
              style={{ backgroundColor: c.hex }}
              aria-label={`Select ${c.name} highlighter`}
              className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                activeColor === c.hex ? 'border-[#24212A] scale-110' : 'border-white shadow-xs'
              }`}
            />
          ))}
        </div>
      </div>

      {mode === 'note' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter note text to stamp onto page..."
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#FFE3EE] focus:outline-hidden focus:border-[#E83E8C]"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[#77717B]">
          Drag or tap directly on the PDF page below ({annotations.length} mark{annotations.length === 1 ? '' : 's'})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addQuickHighlight}
            className="px-2.5 py-1 rounded-lg bg-[#FFF4F8] border border-[#FDC6DD] text-[#C92B72] font-bold hover:bg-[#FFE3EE] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Mark</span>
          </button>
          <button
            type="button"
            disabled={annotations.length === 0}
            onClick={() => onChangeAnnotations((prev) => prev.slice(0, -1))}
            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={annotations.length === 0}
            onClick={() => onChangeAnnotations([])}
            className="px-2 py-1 rounded-lg border border-slate-200 text-[#D9364F] hover:bg-[#FFF4F8] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {numPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#FFF4F8] rounded-xl border border-[#FFE3EE] text-xs">
          <button
            type="button"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded-lg bg-white border border-[#FFE3EE] font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="font-bold text-[#24212A]">
            Page {pageNum} of {numPages}
          </span>
          <button
            type="button"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            className="px-2 py-1 rounded-lg bg-white border border-[#FFE3EE] font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive PDF Canvas Surface */}
      <div className="overflow-auto bg-slate-100 rounded-xl p-2 sm:p-3 flex justify-center">
        <div
          ref={overlayRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            handlePointerDown(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative inline-block shadow-md rounded border border-slate-200 bg-white select-none touch-none cursor-crosshair"
        >
          <canvas ref={canvasRef} className="block max-w-full h-auto" />

          {/* Existing Highlights on Current Page */}
          {pageAnnotations.map((ann) =>
            ann.kind === 'highlight' ? (
              <div
                key={ann.id}
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: `${ann.w * 100}%`,
                  height: `${ann.h * 100}%`,
                  backgroundColor: ann.color,
                  opacity: ann.opacity ?? 0.4,
                }}
                className="absolute pointer-events-none rounded-xs border border-black/15"
              />
            ) : (
              <div
                key={ann.id}
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  backgroundColor: `${ann.color}44`,
                  borderColor: ann.color,
                }}
                className="absolute pointer-events-none px-1.5 py-0.5 text-[11px] font-bold text-[#24212A] border rounded shadow-2xs -translate-y-1/2"
              >
                {ann.text}
              </div>
            )
          )}

          {/* Active Drag Preview */}
          {dragStart && dragCurr && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurr.x) * 100}%`,
                top: `${Math.min(dragStart.y, dragCurr.y) * 100}%`,
                width: `${Math.abs(dragCurr.x - dragStart.x) * 100}%`,
                height: `${Math.abs(dragCurr.y - dragStart.y) * 100}%`,
                backgroundColor: activeColor,
                opacity: 0.42,
              }}
              className="absolute pointer-events-none border-2 border-dashed border-[#24212A]"
            />
          )}
        </div>
      </div>
    </div>
  );
};
