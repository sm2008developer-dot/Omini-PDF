/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Loader2,
  Download,
  Eye,
  Maximize2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PdfPreviewModalProps {
  file?: File | Blob | null;
  fileUrl?: string;
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
  downloadUrl?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  file,
  fileUrl,
  fileName,
  isOpen,
  onClose,
  downloadUrl,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [useNativeViewer, setUseNativeViewer] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayName = fileName || (file instanceof File ? file.name : 'Document_Preview.pdf');
  const fileSize = file ? (file.size / 1024).toFixed(1) : 'Document';

  useEffect(() => {
    if (!isOpen || (!file && !fileUrl)) {
      if (blobUrl && file) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    const url = file ? URL.createObjectURL(file) : fileUrl!;
    setBlobUrl(url);

    let isMounted = true;
    const renderPdfPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const arrayBuffer = file
          ? await file.arrayBuffer()
          : await (await fetch(fileUrl!)).arrayBuffer();
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
          console.warn('PDF.js render notice, switching to native viewer:', err);
          // If worker or canvas fails, seamlessly switch to native iframe viewer
          setUseNativeViewer(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!useNativeViewer) {
      renderPdfPage();
    }

    return () => {
      isMounted = false;
    };
  }, [file, isOpen, currentPage, scale, useNativeViewer]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-[#FFE3EE]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFE3EE] flex items-center justify-between bg-[#FFF4F8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE3EE] text-[#E83E8C] flex items-center justify-center font-bold shadow-xs">
              <Eye className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[#24212A] text-base truncate max-w-xs sm:max-w-md">
                  {displayName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE3EE] text-[#C92B72]">
                  Live Preview
                </span>
              </div>
              <p className="text-xs text-[#77717B]">
                {fileSize} KB • {numPages > 0 ? `${numPages} Pages` : 'Loading preview...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={displayName}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#E83E8C] hover:bg-[#C92B72] shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-[#77717B] hover:text-[#24212A] hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-[#24212A]">
          <div className="flex items-center gap-2">
            {!useNativeViewer && (
              <>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold disabled:opacity-40 hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="font-bold px-2 text-[#24212A]">
                  Page {currentPage} of {numPages || '1'}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages || loading}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold disabled:opacity-40 hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!useNativeViewer && (
              <>
                <button
                  onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-slate-600 px-1">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setUseNativeViewer(!useNativeViewer)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{useNativeViewer ? 'Page View' : 'Full Document View'}</span>
            </button>
          </div>
        </div>

        {/* Canvas / IFrame Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/60 flex items-center justify-center min-h-[460px] relative">
          {loading && !useNativeViewer && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-[#E83E8C] animate-spin" />
              <p className="text-xs font-bold text-[#24212A]">Generating high-res live preview...</p>
            </div>
          )}

          {useNativeViewer && blobUrl ? (
            <iframe
              src={blobUrl}
              title={displayName}
              className="w-full h-full min-h-[500px] rounded-2xl border border-slate-200 shadow-md bg-white"
            />
          ) : (
            <div className="shadow-2xl bg-white rounded-xl p-3 border border-slate-200 overflow-auto max-h-full">
              <canvas ref={canvasRef} className="block mx-auto rounded shadow-xs" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FFF4F8] border-t border-[#FFE3EE] flex items-center justify-between text-xs text-[#77717B]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse"></span>
            Real-time client-side live preview
          </span>
          <div className="flex items-center gap-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={displayName}
                className="sm:hidden px-3 py-1.5 bg-[#E83E8C] text-white font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Save
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#24212A] hover:bg-[#550B2E] text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
