/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { PdfCanvasViewer, PreviewExtraFile } from './PdfCanvasViewer.js';
import { MonetagDownloadLink } from './MonetagDownloadLink.js';

interface PdfPreviewModalProps {
  file?: File | Blob | null;
  fileUrl?: string;
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
  downloadUrl?: string;
  extraFiles?: PreviewExtraFile[];
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  file,
  fileUrl,
  fileName,
  isOpen,
  onClose,
  downloadUrl,
  extraFiles,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'zip'>('pdf');
  const [objectDownloadUrl, setObjectDownloadUrl] = useState<string | null>(null);

  // Reset pagination & zoom when switching files or reopening modal
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setZoomMultiplier(1.0);
    }
  }, [isOpen, file, fileUrl, fileName]);

  // Ensure a valid download link even when only File/Blob is passed
  useEffect(() => {
    if (!isOpen || downloadUrl || !file) {
      setObjectDownloadUrl(null);
      return;
    }
    const created = URL.createObjectURL(file);
    setObjectDownloadUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [isOpen, file, downloadUrl]);

  if (!isOpen || (!file && !fileUrl)) return null;

  const displayName =
    fileName || (file instanceof File ? file.name : 'Document_Preview.pdf');
  const fileSizeLabel = file ? `${(file.size / 1024).toFixed(1)} KB` : 'Document';
  const effectiveDownloadUrl = downloadUrl || objectDownloadUrl || fileUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${displayName}`}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-[#FFE3EE]">
        {/* Header - mobile safe flex layout so Close X never clips */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#FFE3EE] flex items-center justify-between gap-2 bg-[#FFF4F8]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFE3EE] text-[#E83E8C] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h3 className="font-extrabold text-[#24212A] text-sm sm:text-base truncate pr-1">
                  {displayName}
                </h3>
                <span className="hidden xs:inline-block shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE3EE] text-[#C92B72]">
                  Live Preview
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#77717B] truncate">
                {fileSizeLabel} •{' '}
                {fileType === 'zip'
                  ? `${numPages} Files`
                  : numPages > 0
                  ? `${numPages} Page${numPages === 1 ? '' : 's'}`
                  : 'Loading preview...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {effectiveDownloadUrl && (
              <MonetagDownloadLink
                downloadUrl={effectiveDownloadUrl}
                fileName={displayName}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#E83E8C] hover:bg-[#C92B72] shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Watch Ad &amp; Save</span>
              </MonetagDownloadLink>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#24212A] bg-white border border-[#FFE3EE] hover:bg-[#FFE3EE] hover:text-[#C92B72] rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {fileType !== 'zip' && (
          <div className="bg-slate-50 px-3 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-[#24212A]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold disabled:opacity-40 hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <span className="font-bold px-1.5 text-[#24212A] whitespace-nowrap">
                Page {currentPage} of {numPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(Math.max(1, numPages), p + 1))}
                disabled={currentPage >= numPages}
                className="px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold disabled:opacity-40 hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomMultiplier((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-slate-700 px-1 min-w-[44px] text-center">
                {Math.round(zoomMultiplier * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomMultiplier((z) => Math.min(2.4, Number((z + 0.2).toFixed(2))))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 cursor-pointer"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomMultiplier(1.0)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs font-semibold hover:bg-[#FFF4F8] hover:text-[#E83E8C] cursor-pointer flex items-center gap-1 text-[11px]"
                title="Fit to screen width"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Fit</span>
              </button>
            </div>
          </div>
        )}

        {/* Responsive Canvas / Image / ZIP Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <PdfCanvasViewer
            file={file}
            fileUrl={fileUrl}
            fileName={displayName}
            downloadUrl={effectiveDownloadUrl}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onDocumentLoaded={({ numPages: count, fileType: kind }) => {
              setNumPages(count);
              setFileType(kind);
            }}
            zoomMultiplier={zoomMultiplier}
            fitWidth={true}
            showControls={false}
            extraFiles={extraFiles}
          />
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 bg-[#FFF4F8] border-t border-[#FFE3EE] flex items-center justify-between gap-2 text-xs text-[#77717B]">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse shrink-0"></span>
            <span className="truncate">Real-time client-side live preview</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {effectiveDownloadUrl && (
              <MonetagDownloadLink
                downloadUrl={effectiveDownloadUrl}
                fileName={displayName}
                className="sm:hidden px-3 py-1.5 bg-[#E83E8C] text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Watch Ad &amp; Save</span>
              </MonetagDownloadLink>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 sm:py-2 bg-[#24212A] hover:bg-[#550B2E] text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
