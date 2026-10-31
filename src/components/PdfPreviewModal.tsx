/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PdfPreviewModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    let isMounted = true;
    const renderPdfPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (!isMounted) return;
        setNumPages(pdf.numPages);
        const pageToRender = Math.min(Math.max(1, currentPage), pdf.numPages);
        const page = await pdf.getPage(pageToRender);

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await (page as any).render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render PDF preview.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    renderPdfPage();

    return () => {
      isMounted = false;
    };
  }, [file, isOpen, currentPage, scale]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base truncate max-w-md">{file.name}</h3>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB • {numPages > 0 ? `${numPages} Pages` : 'Loading pages...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm font-medium disabled:opacity-50 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold px-2">
              Page {currentPage} of {numPages || '...'}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm font-medium disabled:opacity-50 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Viewer Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/5 flex items-center justify-center min-h-[420px] relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Rendering page preview...</p>
            </div>
          )}

          {error ? (
            <div className="text-center p-8 bg-white rounded-xl shadow-md border border-rose-100 max-w-md">
              <p className="text-sm font-semibold text-rose-600 mb-2">Preview Notice</p>
              <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
              <p className="text-xs text-slate-400 mt-3">You can still proceed to process or download this file directly.</p>
            </div>
          ) : (
            <div className="shadow-xl bg-white rounded-lg p-2 border border-slate-200 overflow-auto max-h-full">
              <canvas ref={canvasRef} className="block mx-auto rounded shadow-sm" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Client-side PDF rendering via PDF.js</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
