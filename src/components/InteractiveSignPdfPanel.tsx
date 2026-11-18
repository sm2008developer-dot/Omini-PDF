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
  PenTool,
  Type,
  Upload,
  Eraser,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import type { PdfSignaturePlacement } from '../utils/pdfConversionEngine.js';
import { loadImageElement } from '../utils/imageEngine.js';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InteractiveSignPdfPanelProps {
  file: File;
  placements: PdfSignaturePlacement[];
  onChangePlacements: React.Dispatch<React.SetStateAction<PdfSignaturePlacement[]>>;
}

const INK_COLORS = [
  { label: 'Black Ink', hex: '#111827' },
  { label: 'Royal Blue', hex: '#1D4ED8' },
  { label: 'Rose Pink', hex: '#C92B72' },
];

export const InteractiveSignPdfPanel: React.FC<InteractiveSignPdfPanelProps> = ({
  file,
  placements,
  onChangePlacements,
}) => {
  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const sigUploadRef = useRef<HTMLInputElement>(null);

  const [sigTab, setSigTab] = useState<'draw' | 'type' | 'upload'>('type');
  const [inkColor, setInkColor] = useState('#111827');
  const [typedName, setTypedName] = useState('Aarav Sharma');
  const [fontStyle, setFontStyle] = useState<'cursive' | 'serif' | 'mono'>('cursive');
  const [includeDate, setIncludeDate] = useState(true);
  const [includeNameCaption, setIncludeNameCaption] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnInk, setHasDrawnInk] = useState(false);
  const [activeSignatureUrl, setActiveSignatureUrl] = useState<string>('');
  const [uploadedRawFile, setUploadedRawFile] = useState<File | null>(null);
  const [stripWhiteBg, setStripWhiteBg] = useState(true);

  const [numPages, setNumPages] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(null);

  // Load PDF document for page preview
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
        console.warn('Sign PDF load error:', err);
      }
    };
    loadDoc();
    return () => {
      cancelled = true;
      pdfRef.current?.cleanup().catch(() => {});
      pdfRef.current = null;
    };
  }, [file]);

  // Render PDF page
  useEffect(() => {
    let cancelled = false;
    const renderPage = async () => {
      const doc = pdfRef.current;
      const canvas = pageCanvasRef.current;
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

  // Auto-generate transparent typed signature PNG when on 'type' tab
  useEffect(() => {
    if (sigTab !== 'type') return;
    const name = typedName.trim() || 'Signature';
    const c = document.createElement('canvas');
    c.width = 540;
    c.height = 170;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);

    const fontMap = {
      cursive: 'italic 62px "Brush Script MT", "Segoe Script", Georgia, cursive',
      serif: 'italic bold 50px Georgia, "Times New Roman", serif',
      mono: 'bold 42px "Courier New", monospace',
    };
    ctx.font = fontMap[fontStyle];
    ctx.fillStyle = inkColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, c.width / 2, c.height / 2);
    setActiveSignatureUrl(c.toDataURL('image/png'));
  }, [sigTab, typedName, fontStyle, inkColor]);

  // Process uploaded signature image with optional white background removal
  useEffect(() => {
    if (sigTab !== 'upload' || !uploadedRawFile) return;
    let cancelled = false;
    loadImageElement(uploadedRawFile)
      .then(({ img, width, height }) => {
        if (cancelled) return;
        const c = document.createElement('canvas');
        const scale = Math.min(1, 560 / Math.max(width, height));
        c.width = Math.max(40, Math.round(width * scale));
        c.height = Math.max(20, Math.round(height * scale));
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        if (stripWhiteBg) {
          const imgData = ctx.getImageData(0, 0, c.width, c.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (lum > 228) {
              d[i + 3] = 0;
            } else if (lum > 195) {
              d[i + 3] = Math.round(((228 - lum) / 33) * d[i + 3]);
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
        setActiveSignatureUrl(c.toDataURL('image/png'));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sigTab, uploadedRawFile, stripWhiteBg]);

  // Pad drawing handlers
  const getPadPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = padCanvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * c.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * c.height,
    };
  };

  const handlePadDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = padCanvasRef.current;
    if (!c) return;
    c.setPointerCapture?.(e.pointerId);
    const ctx = c.getContext('2d')!;
    const pt = getPadPoint(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    setHasDrawnInk(true);
  };

  const handlePadMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !padCanvasRef.current) return;
    const ctx = padCanvasRef.current.getContext('2d')!;
    const pt = getPadPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const commitDrawnPad = () => {
    setIsDrawing(false);
    if (padCanvasRef.current && hasDrawnInk) {
      setActiveSignatureUrl(padCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearPad = () => {
    const c = padCanvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasDrawnInk(false);
    if (sigTab === 'draw') setActiveSignatureUrl('');
  };

  // Placement handlers on PDF surface
  const toNorm = (clientX: number, clientY: number) => {
    const el = overlayRef.current;
    if (!el) return { x: 0.5, y: 0.75 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handleSurfaceDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeSignatureUrl) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const pt = toNorm(e.clientX, e.clientY);
    setDragStart(pt);
    setDragCurr(pt);
  };

  const handleSurfaceMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setDragCurr(toNorm(e.clientX, e.clientY));
  };

  const handleSurfaceUp = () => {
    if (!dragStart || !dragCurr || !activeSignatureUrl) return;
    const x = Math.min(dragStart.x, dragCurr.x);
    const y = Math.min(dragStart.y, dragCurr.y);
    const w = Math.abs(dragCurr.x - dragStart.x);
    const h = Math.abs(dragCurr.y - dragStart.y);

    const finalW = w < 0.05 ? 0.28 : w;
    const finalH = h < 0.03 ? 0.09 : h;

    onChangePlacements((prev) => [
      ...prev,
      {
        id: `sig_${Date.now()}_${prev.length}`,
        pageIndex: pageNum - 1,
        x: Math.min(0.95 - finalW, Math.max(0, x)),
        y: Math.min(0.95 - finalH, Math.max(0, y)),
        w: finalW,
        h: finalH,
        signatureDataUrl: activeSignatureUrl,
        signerName: includeNameCaption ? typedName.trim() : undefined,
        includeDate,
      },
    ]);
    setDragStart(null);
    setDragCurr(null);
  };

  const placeSignatureQuick = () => {
    if (!activeSignatureUrl) return;
    const countOnPage = placements.filter((p) => p.pageIndex === pageNum - 1).length;
    onChangePlacements((prev) => [
      ...prev,
      {
        id: `sig_${Date.now()}_${prev.length}`,
        pageIndex: pageNum - 1,
        x: Math.min(0.62, 0.14 + (countOnPage % 2) * 0.36),
        y: Math.max(0.15, 0.76 - Math.floor(countOnPage / 2) * 0.14),
        w: 0.28,
        h: 0.09,
        signatureDataUrl: activeSignatureUrl,
        signerName: includeNameCaption ? typedName.trim() : undefined,
        includeDate,
      },
    ]);
  };

  const pagePlacements = placements.filter((p) => p.pageIndex === pageNum - 1);

  return (
    <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-4 space-y-4">
      {/* Signature Creator Studio */}
      <div className="p-3 rounded-xl bg-[#0B0007] border border-[#452035] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {[
              { id: 'type' as const, label: 'Type', icon: <Type className="w-3.5 h-3.5" /> },
              { id: 'draw' as const, label: 'Draw', icon: <PenTool className="w-3.5 h-3.5" /> },
              { id: 'upload' as const, label: 'Upload', icon: <Upload className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSigTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border cursor-pointer transition-colors ${
                  sigTab === tab.id
                    ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]'
                    : 'bg-[#16000D] border-[#452035] text-[#C8B8C4] hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {sigTab !== 'upload' && (
            <div className="flex items-center gap-1.5">
              {INK_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setInkColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={c.label}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                    inkColor === c.hex ? 'border-[#FF1493] ring-2 ring-[#FF4DB8]/40 scale-110' : 'border-[#452035]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {sigTab === 'type' && (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your signature name..."
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-[#452035] bg-[#12000A] text-white placeholder-[#91808C] focus:outline-hidden focus:border-[#FF1493]"
              />
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'cursive', label: 'Script' },
                    { id: 'serif', label: 'Classic' },
                    { id: 'mono', label: 'Mono' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFontStyle(st.id)}
                    className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                      fontStyle === st.id
                        ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]'
                        : 'bg-[#16000D] border-[#452035] text-[#C8B8C4]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
            {activeSignatureUrl && (
              <div className="bg-white rounded-xl border border-[#452035] p-2 flex items-center justify-center h-16">
                <img src={activeSignatureUrl} alt="Typed signature preview" className="max-h-14 w-auto object-contain" />
              </div>
            )}
          </div>
        )}

        {sigTab === 'draw' && (
          <div className="space-y-2">
            <canvas
              ref={padCanvasRef}
              width={540}
              height={170}
              onPointerDown={handlePadDown}
              onPointerMove={handlePadMove}
              onPointerUp={commitDrawnPad}
              onPointerCancel={commitDrawnPad}
              className="w-full h-32 bg-white rounded-xl border-2 border-dashed border-[#FF1493]/70 cursor-crosshair touch-none"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#C8B8C4]">Draw signature cleanly inside the white pad above.</span>
              <button
                type="button"
                onClick={clearPad}
                className="px-2.5 py-1 rounded-lg bg-[#16000D] border border-[#452035] text-[#C8B8C4] hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3 h-3" />
                <span>Clear Pad</span>
              </button>
            </div>
          </div>
        )}

        {sigTab === 'upload' && (
          <div className="space-y-2 text-xs">
            <input
              ref={sigUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setUploadedRawFile(f);
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => sigUploadRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-[#35001F] border border-[#FF1493] text-[#FF4DB8] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadedRawFile ? uploadedRawFile.name : 'Choose Signature Image'}</span>
              </button>
              <label className="inline-flex items-center gap-1.5 font-semibold text-[#C8B8C4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripWhiteBg}
                  onChange={(e) => setStripWhiteBg(e.target.checked)}
                  className="accent-[#FF1493]"
                />
                <span>Make White Paper Transparent</span>
              </label>
            </div>
            {activeSignatureUrl && (
              <div className="bg-white rounded-xl border border-[#452035] p-2 flex items-center justify-center h-16">
                <img src={activeSignatureUrl} alt="Uploaded signature" className="max-h-14 w-auto object-contain" />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 font-semibold text-[#C8B8C4] cursor-pointer">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
                className="accent-[#FF1493]"
              />
              <span>Stamp Date</span>
            </label>
            <label className="inline-flex items-center gap-1.5 font-semibold text-[#C8B8C4] cursor-pointer">
              <input
                type="checkbox"
                checked={includeNameCaption}
                onChange={(e) => setIncludeNameCaption(e.target.checked)}
                className="accent-[#FF1493]"
              />
              <span>Include Name Caption</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!activeSignatureUrl}
              onClick={placeSignatureQuick}
              className="px-3 py-1.5 rounded-xl bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Place Signature on Page</span>
            </button>
            <button
              type="button"
              disabled={placements.length === 0}
              onClick={() => onChangePlacements([])}
              className="px-2 py-1.5 rounded-xl border border-[#452035] bg-[#16000D] text-[#D9364F] disabled:opacity-40 cursor-pointer"
              aria-label="Clear placed signatures"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Page Preview + Placement Surface */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#C8B8C4] flex items-center gap-1">
          {activeSignatureUrl && <Check className="w-3.5 h-3.5 text-[#1FA971]" />}
          Drag a box on the PDF page below (or tap <strong className="text-white">Place Signature</strong>) — {placements.length} placed
        </span>
      </div>

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

      <div className="overflow-auto bg-[#0B0007] border border-[#452035] rounded-xl p-2 sm:p-3 flex justify-center">
        <div
          ref={overlayRef}
          onPointerDown={handleSurfaceDown}
          onPointerMove={handleSurfaceMove}
          onPointerUp={handleSurfaceUp}
          onPointerCancel={handleSurfaceUp}
          className="relative inline-block shadow-md rounded border border-[#452035] bg-white select-none touch-none cursor-crosshair"
        >
          <canvas ref={pageCanvasRef} className="block max-w-full h-auto" />

          {pagePlacements.map((pl) => (
            <div
              key={pl.id}
              style={{
                left: `${pl.x * 100}%`,
                top: `${pl.y * 100}%`,
                width: `${pl.w * 100}%`,
                height: `${pl.h * 100}%`,
              }}
              className="absolute pointer-events-none border-2 border-[#E90083]/80 bg-white/40 rounded flex flex-col items-center justify-center p-0.5"
            >
              <img
                src={pl.signatureDataUrl}
                alt="Placed signature"
                className="max-w-full max-h-full object-contain"
              />
              {(pl.signerName || pl.includeDate) && (
                <span className="text-[9px] font-semibold text-slate-800 bg-white/85 px-1 rounded truncate max-w-full">
                  {[pl.signerName, pl.includeDate ? new Date().toLocaleDateString() : null].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
          ))}

          {dragStart && dragCurr && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurr.x) * 100}%`,
                top: `${Math.min(dragStart.y, dragCurr.y) * 100}%`,
                width: `${Math.abs(dragCurr.x - dragStart.x) * 100}%`,
                height: `${Math.abs(dragCurr.y - dragStart.y) * 100}%`,
              }}
              className="absolute pointer-events-none border-2 border-dashed border-[#FF1493] bg-[#FF1493]/15"
            />
          )}
        </div>
      </div>
    </div>
  );
};
