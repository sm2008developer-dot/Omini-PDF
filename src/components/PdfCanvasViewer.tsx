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
  FileText,
  Table,
  Copy,
  Check,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { MonetagDownloadLink } from './MonetagDownloadLink.js';
import { canvasToBlob, loadImageElement } from '../utils/imageEngine.js';
import { parseHtmlToDocBlocks, DocBlock } from '../utils/pdfDocumentUtils.js';

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

export type ViewerFileKind = 'pdf' | 'image' | 'zip' | 'docx' | 'xlsx' | 'txt';

export interface PdfCanvasViewerProps {
  file?: File | Blob | null;
  fileUrl?: string;
  fileName?: string;
  downloadUrl?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoaded?: (info: { numPages: number; fileType: ViewerFileKind }) => void;
  zoomMultiplier?: number;
  fitWidth?: boolean;
  showControls?: boolean;
  compact?: boolean;
  extraFiles?: PreviewExtraFile[];
  onSelectExtraFile?: (extra: PreviewExtraFile) => void;
}

function detectFileKind(file?: File | Blob | null, fileName?: string, fileUrl?: string): ViewerFileKind {
  const mime = (file?.type || '').toLowerCase();
  const name = (fileName || (file instanceof File ? file.name : '') || fileUrl || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)(\?|#|$)/i.test(name)) {
    return 'image';
  }
  if (mime.includes('zip') || /\.zip(\?|#|$)/i.test(name)) {
    return 'zip';
  }
  if (mime.includes('wordprocessingml') || mime.includes('msword') || /\.docx?(\?|#|$)/i.test(name)) {
    return 'docx';
  }
  if (
    mime.includes('spreadsheetml') ||
    mime.includes('csv') ||
    /\.(xlsx|xls|csv)(\?|#|$)/i.test(name)
  ) {
    return 'xlsx';
  }
  if (mime.startsWith('text/plain') || /\.txt(\?|#|$)/i.test(name)) {
    return 'txt';
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
  const [fallbackImgUrl, setFallbackImgUrl] = useState<string | null>(null);
  const [internalExtra, setInternalExtra] = useState<PreviewExtraFile | null>(null);
  const [docxBlocks, setDocxBlocks] = useState<DocBlock[]>([]);
  const [xlsxSheets, setXlsxSheets] = useState<Array<{ name: string; rows: string[][] }>>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [plainTextPreview, setPlainTextPreview] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    setInternalExtra(null);
    setSubmittedPassword(undefined);
    setUnlockPassword('');
    setNeedsPassword(false);
    setFallbackImgUrl(null);
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

    if (fileKind === 'docx') {
      cleanupPdf();
      setError(null);
      setImageObjectUrl(null);
      setLoadingDoc(true);
      (async () => {
        try {
          const buf = activeFile
            ? await activeFile.arrayBuffer()
            : await (await fetch(activeUrl!)).arrayBuffer();
          if (cancelled) return;
          const res = await mammoth.convertToHtml({ arrayBuffer: buf });
          const blocks = parseHtmlToDocBlocks(res.value || '');
          if (!cancelled) {
            setDocxBlocks(blocks);
            setNumPages(1);
            onDocumentLoaded?.({ numPages: 1, fileType: 'docx' });
          }
        } catch {
          if (!cancelled) {
            setError('Unable to parse Word (.docx) preview. You can still download the file directly.');
          }
        } finally {
          if (!cancelled) setLoadingDoc(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (fileKind === 'xlsx') {
      cleanupPdf();
      setError(null);
      setImageObjectUrl(null);
      setLoadingDoc(true);
      (async () => {
        try {
          const buf = activeFile
            ? await activeFile.arrayBuffer()
            : await (await fetch(activeUrl!)).arrayBuffer();
          if (cancelled) return;
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
          const parsed = wb.SheetNames.map((name) => {
            const sheet = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }).map((r) =>
              Array.isArray(r) ? r.map((c) => (c === undefined || c === null ? '' : String(c))) : []
            );
            return { name, rows };
          });
          if (!cancelled) {
            setXlsxSheets(parsed);
            setActiveSheetIdx(0);
            setNumPages(parsed.length || 1);
            onDocumentLoaded?.({ numPages: parsed.length || 1, fileType: 'xlsx' });
          }
        } catch {
          if (!cancelled) {
            setError('Unable to render spreadsheet preview. Download the Excel file to open it.');
          }
        } finally {
          if (!cancelled) setLoadingDoc(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (fileKind === 'txt') {
      cleanupPdf();
      setError(null);
      setImageObjectUrl(null);
      setLoadingDoc(true);
      (async () => {
        try {
          const txt = activeFile
            ? await activeFile.text()
            : await (await fetch(activeUrl!)).text();
          if (!cancelled) {
            setPlainTextPreview(txt);
            setNumPages(1);
            onDocumentLoaded?.({ numPages: 1, fileType: 'txt' });
          }
        } catch {
          if (!cancelled) setError('Unable to read text file preview.');
        } finally {
          if (!cancelled) setLoadingDoc(false);
        }
      })();
      return () => {
        cancelled = true;
      };
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#35001F] border-b border-[#452035] text-xs">
          <button
            type="button"
            onClick={() => setInternalExtra(null)}
            className="px-2.5 py-1 bg-[#16000D] border border-[#FF1493] text-[#FF4DB8] rounded-lg font-bold hover:bg-[#0B0007] cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to ZIP Archive</span>
          </button>
          <span className="truncate font-semibold text-white">{internalExtra.name}</span>
        </div>
      )}
      {showControls && fileKind === 'pdf' && numPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0B0007] border-b border-[#452035] text-xs">
          <button
            type="button"
            onClick={() => setPage(activePage - 1)}
            disabled={activePage <= 1 || loadingDoc}
            className="px-2.5 py-1 bg-[#16000D] border border-[#452035] rounded-lg font-semibold text-white disabled:opacity-40 hover:border-[#FF1493] hover:text-[#FF4DB8] cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-bold text-white">
            Page {activePage} of {numPages}
          </span>

          <button
            type="button"
            onClick={() => setPage(activePage + 1)}
            disabled={activePage >= numPages || loadingDoc}
            className="px-2.5 py-1 bg-[#16000D] border border-[#452035] rounded-lg font-semibold text-white disabled:opacity-40 hover:border-[#FF1493] hover:text-[#FF4DB8] cursor-pointer flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative w-full overflow-auto bg-[#0B0007] ${
          compact ? 'min-h-[260px] max-h-[440px] p-2 sm:p-3' : 'flex-1 min-h-[340px] p-3 sm:p-5'
        }`}
      >
        {(loadingDoc || renderingPage) && fileKind === 'pdf' && (
          <div className="absolute inset-0 bg-[#050005]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            <Loader2 className="w-7 h-7 text-[#FF1493] animate-spin" />
            <p className="text-xs font-bold text-white">Rendering crisp page preview...</p>
          </div>
        )}

        {fileKind === 'zip' ? (
          <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-5 text-center max-w-lg mx-auto my-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#35001F] border border-[#452035] text-[#FF4DB8] mx-auto flex items-center justify-center mb-3">
              <FileArchive className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">
              ZIP Archive Ready {extraFiles?.length ? `(${extraFiles.length} Files)` : ''}
            </h4>
            <p className="text-xs text-[#C8B8C4] mt-1">
              Click <strong className="text-white">View</strong> on any page or image below to inspect it live.
            </p>
            {extraFiles && extraFiles.length > 0 && (
              <div className="mt-4 space-y-2 text-left max-h-60 overflow-y-auto pr-1">
                {extraFiles.map((extra, idx) => {
                  const isImg = /\.(png|jpe?g|webp|gif)$/i.test(extra.name);
                  return (
                    <div
                      key={`${extra.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0007] border border-[#452035] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isImg && (
                          <img
                            src={extra.url}
                            alt={extra.name}
                            className="w-8 h-10 object-cover rounded border border-[#452035] bg-[#12000A] shrink-0"
                          />
                        )}
                        <span className="truncate font-medium text-white">{extra.name}</span>
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
                          className="px-2 py-1 rounded-md bg-[#35001F] border border-[#452035] text-[#FF4DB8] font-bold hover:border-[#FF1493] flex items-center gap-1 cursor-pointer"
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
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1FA971] text-white text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
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
                className="px-2.5 py-1 rounded-lg bg-[#16000D] border border-[#452035] text-[11px] font-semibold text-[#C8B8C4] hover:border-[#FF1493] hover:text-[#FF4DB8] cursor-pointer"
              >
                Backdrop: {showCheckerboard ? 'Checkerboard (Alpha)' : 'Solid White'}
              </button>
            </div>
            <div
              className="w-fit mx-auto p-2 rounded-xl border border-[#452035] shadow-md"
              style={
                showCheckerboard
                  ? {
                      backgroundImage:
                        'linear-gradient(45deg, #250819 25%, transparent 25%), linear-gradient(-45deg, #250819 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #250819 75%), linear-gradient(-45deg, transparent 75%, #250819 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      backgroundColor: '#12000A',
                    }
                  : { backgroundColor: '#ffffff' }
              }
            >
              <img
                src={fallbackImgUrl || imageObjectUrl}
                alt={fileName || 'Image Preview'}
                onError={() => {
                  if (!fallbackImgUrl && activeFile) {
                    loadImageElement(activeFile)
                      .then(({ img }) => canvasToBlob(img, 'png', 0.92))
                      .then((pngBlob) => {
                        setFallbackImgUrl(URL.createObjectURL(pngBlob));
                      })
                      .catch(() => {
                        setError('Unable to decode this image preview in browser.');
                      });
                  }
                }}
                style={{
                  width: zoomMultiplier === 1 ? '100%' : `${Math.round(zoomMultiplier * 100)}%`,
                  maxWidth: zoomMultiplier <= 1 ? '100%' : 'none',
                }}
                className="block rounded-lg h-auto mx-auto object-contain"
              />
            </div>
          </div>
        ) : fileKind === 'docx' && !error ? (
          <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-5 sm:p-6 max-w-2xl mx-auto my-2 shadow-sm text-left space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#452035]">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF4DB8]">
                <FileText className="w-4 h-4 text-[#FF1493]" />
                Word (.docx) Live Preview
              </span>
              <span className="text-[11px] text-[#91808C]">{docxBlocks.length} blocks</span>
            </div>
            {docxBlocks.length === 0 ? (
              <p className="text-xs text-[#91808C]">Loading Word content...</p>
            ) : (
              <div className="space-y-2 text-[#C8B8C4]">
                {docxBlocks.slice(0, 120).map((b, idx) =>
                  b.kind === 'h1' ? (
                    <h3 key={idx} className="text-base font-extrabold text-[#FF4DB8] pt-1">
                      {b.text}
                    </h3>
                  ) : b.kind === 'h2' || b.kind === 'h3' ? (
                    <h4 key={idx} className="text-sm font-bold text-white pt-1">
                      {b.text}
                    </h4>
                  ) : (
                    <p key={idx} className="text-xs leading-relaxed text-[#C8B8C4]">
                      {b.text}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        ) : fileKind === 'xlsx' && !error ? (
          <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-4 max-w-3xl mx-auto my-2 shadow-sm text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#452035]">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1FA971]">
                <Table className="w-4 h-4" />
                Spreadsheet Table Preview
              </span>
              {xlsxSheets.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {xlsxSheets.map((s, i) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setActiveSheetIdx(i)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer ${
                        activeSheetIdx === i
                          ? 'bg-[#35001F] border-[#FF1493] text-[#FF4DB8]'
                          : 'bg-[#0B0007] border-[#452035] text-[#C8B8C4]'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto max-h-80 border border-[#452035] rounded-xl bg-[#0B0007]">
              <table className="w-full text-[11px] border-collapse text-[#C8B8C4]">
                <tbody>
                  {(xlsxSheets[activeSheetIdx]?.rows || []).slice(0, 60).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx === 0 ? 'bg-[#35001F] font-bold text-white' : 'border-t border-[#452035]/60'}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1.5 border-r border-[#452035]/60 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : fileKind === 'txt' && !error ? (
          <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-4 max-w-2xl mx-auto my-2 shadow-sm text-left space-y-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#452035]">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <FileText className="w-4 h-4 text-[#FF4DB8]" />
                Extracted Text Preview
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(plainTextPreview).then(() => {
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 1800);
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-[#35001F] border border-[#452035] text-[#FF4DB8] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedText ? <Check className="w-3 h-3 text-[#1FA971]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-[#C8B8C4] whitespace-pre-wrap break-words max-h-80 overflow-y-auto bg-[#12000A] p-3 rounded-xl border border-[#452035]">
              {plainTextPreview}
            </pre>
          </div>
        ) : error ? (
          <div className="bg-[#16000D] rounded-2xl border border-[#452035] p-5 text-center max-w-md mx-auto my-4 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-full bg-[#35001F] border border-[#452035] text-[#D9364F] mx-auto flex items-center justify-center">
              {needsPassword ? <Lock className="w-5 h-5 text-[#FF4DB8]" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <p className="text-xs font-bold text-white">{error}</p>
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
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#452035] bg-[#12000A] text-white placeholder-[#91808C] focus:outline-hidden focus:border-[#FF1493]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#E90083] hover:bg-[#FF1493] active:bg-[#C90070] text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Unlock
                </button>
              </form>
            )}
            {downloadUrl && (
              <MonetagDownloadLink
                downloadUrl={downloadUrl}
                fileName={fileName || 'document.pdf'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E90083] text-white text-xs font-bold hover:bg-[#FF1493] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Watch Ad &amp; Download File</span>
              </MonetagDownloadLink>
            )}
          </div>
        ) : (
          <div className="w-fit mx-auto bg-white p-2 sm:p-3 rounded-xl border border-[#452035] shadow-lg">
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
