/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Loader2,
  AlertCircle,
  Eye,
  Lock,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MonetagDownloadLink } from './MonetagDownloadLink.js';

function ensurePdfWorker() {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
}

ensurePdfWorker();

export interface PreviewExtraFile {
  name: string;
  url: string;
  size: number;
  blob?: Blob;
}

export interface PdfCanvasViewerProps {
  file?: File | Blob | null;
  fileUrl?: string;
  fileName?: string;
  downloadUrl?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoaded?: (info: { numPages: number; fileType: 'pdf' | 'image' | 'zip' }) => void;
  zoomMultiplier?: number;
  fitWidth?: boolean;
  showControls?: boolean;
  compact?: boolean;
  extraFiles?: PreviewExtraFile[];
  onSelectExtraFile?: (extra: PreviewExtraFile) => void;
}

function detectFileKind(file?: File | Blob | null, fileName?: string, fileUrl?: string): 'pdf' | 'image' | 'zip' {
  const mime = (file?.type || '').toLowerCase();
  const name = (fileName || (file instanceof File ? file.name : '') || fileUrl || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)(\?|#|$)/i.test(name)) {
    return 'image';
  }
  if (mime.includes('zip') || /\.zip(\?|#|$)/i.test(name)) {
    return 'zip';
  }
  return 'pdf';
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  file,
  fileUrl,
  fileName,
  downloadUrl,
  currentPage: controlledPage,
  onPageChange,
  onDocumentLoaded,
  zoomMultiplier = 1,
  fitWidth = true,
  showControls = true,
  compact = false,
  extraFiles,
  onSelectExtraFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeRenderTaskRef = useRef<any>(null);
  const renderIdRef = useRef<number>(0);

  const [internalPage, setInternalPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [renderingPage, setRenderingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>(undefined);
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number>(340);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [internalExtra, setInternalExtra] = useState<PreviewExtraFile | null>(null);

  useEffect(() => {
    setInternalExtra(null);
    setSubmittedPassword(undefined);
    setUnlockPassword('');
    setNeedsPassword(false);
  }, [file, fileUrl, fileName]);

  const activeFile = internalExtra ? internalExtra.blob || null : file;
  const activeUrl = internalExtra ? internalExtra.url : fileUrl;
  const activeName = internalExtra ? internalExtra.name : fileName;

  const activePage = controlledPage ?? internalPage;
  const setPage = (nextPage: number) => {
    const clamped = Math.max(1, numPages > 0 ? Math.min(numPages, nextPage) : nextPage);
    setInternalPage(clamped);
    onPageChange?.(clamped);
  };

  const fileKind = detectFileKind(activeFile, activeName, activeUrl);

  // Measure available container width for responsive fit-width scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 40) setContainerWidth(w);
    };

    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateWidth());
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load Image or PDF document when input changes
  useEffect(() => {
    let cancelled = false;
    let createdImgUrl: string | null = null;

    // Clean up previous PDF document & render task
    const cleanupPdf = async () => {
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
      }
      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.cleanup();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }
      if (loadingTaskRef.current) {
        try {
          await loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
        loadingTaskRef.current = null;
      }
    };

    if (!activeFile && !activeUrl) {
      setNumPages(0);
      setError(null);
      return;
    }

    if (fileKind === 'image') {
      cleanupPdf();
      setError(null);
      setLoadingDoc(false);
      setNumPages(1);
      setInternalPage(1);
      if (activeFile) {
        createdImgUrl = URL.createObjectURL(activeFile);
        setImageObjectUrl(createdImgUrl);
      } else {
        setImageObjectUrl(activeUrl || null);
      }
      onDocumentLoaded?.({ numPages: 1, fileType: 'image' });
      return () => {
        if (createdImgUrl) URL.revokeObjectURL(createdImgUrl);
      };
    }

    if (fileKind === 'zip') {
      cleanupPdf();
      setError(null);
      setLoadingDoc(false);
      setImageObjectUrl(null);
      setNumPages(extraFiles?.length || 1);
      onDocumentLoaded?.({ numPages: extraFiles?.length || 1, fileType: 'zip' });
      return;
    }

    setImageObjectUrl(null);

    const loadPdf = async () => {
      setLoadingDoc(true);
      setError(null);
      await cleanupPdf();

      try {
        ensurePdfWorker();
        const rawBuffer = activeFile
          ? await activeFile.arrayBuffer()
          : await (await fetch(activeUrl!)).arrayBuffer();

        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(rawBuffer),
          password: submittedPassword,
        });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;

        if (cancelled) {
          await loadingTask.destroy().catch(() => {});
          return;
        }

        setNeedsPassword(false);
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setInternalPage(1);
        if (controlledPage !== undefined && controlledPage !== 1) {
          onPageChange?.(1);
        }
        onDocumentLoaded?.({ numPages: pdf.numPages, fileType: 'pdf' });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '';
          const errName = err instanceof Error ? err.name : '';
          const isPasswordErr =
            errName === 'PasswordException' ||
            msg.toLowerCase().includes('password') ||
            msg.toLowerCase().includes('no password given');

          if (isPasswordErr) {
            setNeedsPassword(true);
            setError(
              submittedPassword
                ? 'Incorrect password. Please try again.'
                : 'This PDF is password-protected (AES-256). Enter password to preview or download.'
            );
          } else {
            console.error('PDF load error:', err);
            setNeedsPassword(false);
            setError('Unable to render this PDF preview in browser.');
          }
          setNumPages(0);
        }
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      cleanupPdf();
      if (createdImgUrl) URL.revokeObjectURL(createdImgUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, activeUrl, fileKind, submittedPassword]);

  // Render the active page whenever page number, zoom, or container width changes
  useEffect(() => {
    if (fileKind !== 'pdf' || loadingDoc) return;
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || numPages <= 0) return;

    let cancelled = false;
    const renderId = ++renderIdRef.current;

    const renderPage = async () => {
      // Wait for any in-flight render task on this canvas to cancel & finish cleanly
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
          await activeRenderTaskRef.current.promise.catch(() => {});
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
      }

      if (cancelled) return;

      try {
        setRenderingPage(true);
        const pageNum = Math.min(Math.max(1, activePage), pdf.numPages);
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        // Account for container padding + inner paper card padding & borders
        const horizontalPadding = compact ? 40 : 68;
        const targetCssWidth = Math.max(200, containerWidth - horizontalPadding);
        const fitScale = targetCssWidth / unscaledViewport.width;
        const baseScale = fitWidth ? Math.min(2.2, Math.max(0.3, fitScale)) : 1.0;
        const effectiveScale = Math.max(0.25, Math.min(3.5, baseScale * zoomMultiplier));

        const viewport = page.getViewport({ scale: effectiveScale });
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderParams: Record<string, unknown> = {
          canvas,
          viewport,
          background: '#ffffff',
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        };

        const renderTask = page.render(renderParams as unknown as Parameters<typeof page.render>[0]);
        activeRenderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!cancelled) {
          setError(null);
        }
      } catch (err: unknown) {
        const name = err instanceof Error ? err.name : '';
        const message = err instanceof Error ? err.message : '';
        if (name === 'RenderingCancelledException' || message.includes('cancelled')) {
          return;
        }
        if (!cancelled) {
          console.error('PDF page render error:', err);
          setError('Could not render this PDF page preview.');
        }
      } finally {
        if (renderId === renderIdRef.current) {
          setRenderingPage(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [fileKind, loadingDoc, numPages, activePage, zoomMultiplier, fitWidth, containerWidth, compact]);

  return (
    <div className="w-full flex flex-col">
      {internalExtra && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FFE3EE] border-b border-[#FDC6DD] text-xs">
          <button
            type="button"
            onClick={() => setInternalExtra(null)}
            className="px-2.5 py-1 bg-white border border-[#E83E8C] text-[#C92B72] rounded-lg font-bold hover:bg-[#FFF4F8] cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to ZIP Archive</span>
          </button>
          <span className="truncate font-semibold text-[#24212A]">{internalExtra.name}</span>
        </div>
      )}
      {showControls && fileKind === 'pdf' && numPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FFF4F8] border-b border-[#FFE3EE] text-xs">
          <button
            type="button"
            onClick={() => setPage(activePage - 1)}
            disabled={activePage <= 1 || loadingDoc}
            className="px-2.5 py-1 bg-white border border-[#FFE3EE] rounded-lg font-semibold text-[#24212A] disabled:opacity-40 hover:border-[#E83E8C] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-bold text-[#24212A]">
            Page {activePage} of {numPages}
          </span>

          <button
            type="button"
            onClick={() => setPage(activePage + 1)}
            disabled={activePage >= numPages || loadingDoc}
            className="px-2.5 py-1 bg-white border border-[#FFE3EE] rounded-lg font-semibold text-[#24212A] disabled:opacity-40 hover:border-[#E83E8C] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative w-full overflow-auto bg-slate-100/80 ${
          compact ? 'min-h-[260px] max-h-[440px] p-2 sm:p-3' : 'flex-1 min-h-[340px] p-3 sm:p-5'
        }`}
      >
        {(loadingDoc || renderingPage) && fileKind === 'pdf' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            <Loader2 className="w-7 h-7 text-[#E83E8C] animate-spin" />
            <p className="text-xs font-bold text-[#24212A]">Rendering crisp page preview...</p>
          </div>
        )}

        {fileKind === 'zip' ? (
          <div className="bg-white rounded-2xl border border-[#FFE3EE] p-5 text-center max-w-lg mx-auto my-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE3EE] text-[#E83E8C] mx-auto flex items-center justify-center mb-3">
              <FileArchive className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#24212A]">
              ZIP Archive Ready {extraFiles?.length ? `(${extraFiles.length} Files)` : ''}
            </h4>
            <p className="text-xs text-[#77717B] mt-1">
              Click <strong className="text-[#24212A]">View</strong> on any page or image below to inspect it live.
            </p>
            {extraFiles && extraFiles.length > 0 && (
              <div className="mt-4 space-y-2 text-left max-h-60 overflow-y-auto pr-1">
                {extraFiles.map((extra, idx) => {
                  const isImg = /\.(png|jpe?g|webp|gif)$/i.test(extra.name);
                  return (
                    <div
                      key={`${extra.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isImg && (
                          <img
                            src={extra.url}
                            alt={extra.name}
                            className="w-8 h-10 object-cover rounded border border-[#FFE3EE] bg-white shrink-0"
                          />
                        )}
                        <span className="truncate font-medium text-[#24212A]">{extra.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectExtraFile) {
                              onSelectExtraFile(extra);
                            } else {
                              setInternalExtra(extra);
                            }
                          }}
                          className="px-2 py-1 rounded-md bg-white border border-[#E83E8C]/30 text-[#E83E8C] font-bold hover:bg-[#FFE3EE] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <MonetagDownloadLink
                          downloadUrl={extra.url}
                          fileName={extra.name}
                          className="text-[#1FA971] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Ad &amp; Save</span>
                        </MonetagDownloadLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {downloadUrl && (
              <MonetagDownloadLink
                downloadUrl={downloadUrl}
                fileName={fileName || 'output.zip'}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1FA971] text-white text-xs font-bold hover:bg-[#168a5c] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Watch Ad &amp; Download ZIP</span>
              </MonetagDownloadLink>
            )}
          </div>
        ) : fileKind === 'image' && imageObjectUrl ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCheckerboard((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-[#E83E8C] hover:text-[#C92B72] cursor-pointer"
              >
                Backdrop: {showCheckerboard ? 'Checkerboard (Alpha)' : 'Solid White'}
              </button>
            </div>
            <div
              className="w-fit mx-auto p-2 rounded-xl border border-slate-200 shadow-md"
              style={
                showCheckerboard
                  ? {
                      backgroundImage:
                        'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      backgroundColor: '#ffffff',
                    }
                  : { backgroundColor: '#ffffff' }
              }
            >
              <img
                src={imageObjectUrl}
                alt={fileName || 'Image Preview'}
                style={{
                  width: zoomMultiplier === 1 ? '100%' : `${Math.round(zoomMultiplier * 100)}%`,
                  maxWidth: zoomMultiplier <= 1 ? '100%' : 'none',
                }}
                className="block rounded-lg h-auto mx-auto object-contain"
              />
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-[#FFE3EE] p-5 text-center max-w-md mx-auto my-4 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-full bg-[#FFE3EE] text-[#D9364F] mx-auto flex items-center justify-center">
              {needsPassword ? <Lock className="w-5 h-5 text-[#E83E8C]" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <p className="text-xs font-bold text-[#24212A]">{error}</p>
            {needsPassword && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmittedPassword(unlockPassword);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter PDF password to preview..."
                  aria-label="Enter PDF password"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E83E8C]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#24212A] hover:bg-[#550B2E] text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Unlock
                </button>
              </form>
            )}
            {downloadUrl && (
              <MonetagDownloadLink
                downloadUrl={downloadUrl}
                fileName={fileName || 'document.pdf'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E83E8C] text-white text-xs font-bold hover:bg-[#C92B72] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Watch Ad &amp; Download File</span>
              </MonetagDownloadLink>
            )}
          </div>
        ) : (
          <div className="w-fit mx-auto bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-lg">
            <canvas
              ref={canvasRef}
              data-testid="pdf-preview-canvas"
              className="block rounded shadow-2xs bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
