/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  MoveUp,
  MoveDown,
  Download,
  CheckCircle2,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Minimize2,
  Combine,
  Split,
  Stamp,
  FileImage,
  ImageDown,
  RefreshCw,
  AlertCircle,
  FileCheck,
  FolderArchive,
  Layers,
} from 'lucide-react';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { User, PlatformLimits, api } from '../utils/api.js';
import {
  mergePdfFiles,
  splitPdfFile,
  compressPdfFile,
  protectPdfFile,
  addWatermarkToPdf,
  imagesToPdf,
  pdfToImages,
  ProcessedPdfResult,
} from '../utils/pdfEngine.js';

interface PdfToolWorkspaceProps {
  toolId: ToolId;
  user: User | null;
  limits: PlatformLimits;
  onBack: () => void;
  onRequireAuth: (reason: string) => void;
  onRequireUpgrade: (reason: string) => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const PdfToolWorkspace: React.FC<PdfToolWorkspaceProps> = ({
  toolId,
  user,
  limits,
  onBack,
  onRequireAuth,
  onRequireUpgrade,
  onUserUpdate,
}) => {
  const tool = TOOLS_CONFIG.find((t) => t.id === toolId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files state
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedPdfResult | null>(null);

  // Tool-specific configurations
  // 1. Split
  const [splitMode, setSplitMode] = useState<'all' | 'range'>('range');
  const [splitRange, setSplitRange] = useState('1-2');

  // 2. Compress
  const [compressLevel, setCompressLevel] = useState<'recommended' | 'extreme' | 'light'>('recommended');

  // 3. Protect
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);

  // 4. Watermark
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.35);
  const [watermarkFontSize, setWatermarkFontSize] = useState(48);
  const [watermarkAngle, setWatermarkAngle] = useState(45);
  const [watermarkColor, setWatermarkColor] = useState('#e11d48');
  const [watermarkPlacement, setWatermarkPlacement] = useState<'diagonal' | 'center' | 'top-right' | 'bottom-center'>('diagonal');

  // 5. Image to PDF
  const [imagePageSize, setImagePageSize] = useState<'fit' | 'a4'>('fit');
  const [imageOrientation, setImageOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  // 6. PDF to Image
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageScale, setImageScale] = useState(1.5);

  const isMultiple = toolId === 'merge-pdf' || toolId === 'image-to-pdf';
  const acceptedTypes = toolId === 'image-to-pdf' ? 'image/png,image/jpeg,image/webp' : '.pdf,application/pdf';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files);
    if (isMultiple) {
      setFiles((prev) => [...prev, ...selected]);
    } else {
      setFiles([selected[0]]);
    }
    setResult(null);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const copy = [...files];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setFiles(copy);
  };

  // Generate a sample PDF file directly in the browser so users can test immediately!
  const loadSamplePdf = async () => {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

      for (let i = 1; i <= 3; i++) {
        const page = doc.addPage([595.28, 841.89]); // A4
        page.drawText(`Omini PDF Sample Document - Page ${i}`, {
          x: 50,
          y: 780,
          size: 18,
          font: boldFont,
          color: rgb(0.88, 0.11, 0.28),
        });

        page.drawText(
          `This is sample page ${i} generated for testing ${tool?.name || 'PDF operations'}.\n` +
          `Document Title: Annual Operations & Financial Audit Report\n` +
          `Date: ${new Date().toLocaleDateString()}\n` +
          `Status: Verified Draft\n\n` +
          `Executive Insights:\n` +
          `- Scalable processing infrastructure tested.\n` +
          `- Multi-page extraction and watermarking enabled.\n` +
          `- 256-bit encryption and security validation.`,
          {
            x: 50,
            y: 720,
            size: 11,
            font,
            color: rgb(0.2, 0.25, 0.3),
            lineHeight: 16,
          }
        );
      }

      const pdfBytes = await doc.save();
      const sampleBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const sampleFile = new File([sampleBlob], `Sample_Audit_Report.pdf`, {
        type: 'application/pdf',
      });

      if (isMultiple) {
        // Create 2 distinct samples for merge
        const doc2 = await PDFDocument.create();
        const p2 = doc2.addPage([595.28, 841.89]);
        p2.drawText('Appendix & Financial Addendum (Sample 2)', {
          x: 50,
          y: 780,
          size: 16,
          font: boldFont,
          color: rgb(0.1, 0.3, 0.8),
        });
        const bytes2 = await doc2.save();
        const file2 = new File([new Blob([bytes2 as unknown as BlobPart], { type: 'application/pdf' })], 'Appendix_Financial_Data.pdf', {
          type: 'application/pdf',
        });
        setFiles([sampleFile, file2]);
      } else {
        setFiles([sampleFile]);
      }
      setResult(null);
      setError(null);
    } catch (err) {
      console.error('Failed to load sample PDF:', err);
    }
  };

  const handleProcess = async () => {
    // 1. Guard Authentication
    if (!user) {
      onRequireAuth(`Please sign in or create an account to process documents with ${tool?.name}.`);
      return;
    }

    // 2. Guard Free Plan Quota
    if (user.plan === 'free' && user.pdfOperationsUsed >= limits.freePdfLimit) {
      onRequireUpgrade(`You have used all ${limits.freePdfLimit} free PDF operations. Upgrade to Pro for unlimited usage!`);
      return;
    }

    // 3. Validate Inputs
    if (files.length === 0) {
      setError('Please upload or select at least one file.');
      return;
    }

    if (toolId === 'merge-pdf' && files.length < 2) {
      setError('Merge PDF requires at least 2 PDF documents.');
      return;
    }

    if (toolId === 'protect-pdf') {
      if (!password) {
        setError('Please enter a password to protect the document.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please retype carefully.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      let output: ProcessedPdfResult;

      switch (toolId) {
        case 'merge-pdf':
          output = await mergePdfFiles(files, `merged_${Date.now()}.pdf`);
          break;

        case 'split-pdf':
          output = await splitPdfFile(files[0], splitMode, splitRange);
          break;

        case 'compress-pdf':
          output = await compressPdfFile(files[0], compressLevel);
          break;

        case 'protect-pdf':
          output = await protectPdfFile(files[0], {
            userPassword: password,
            allowPrinting,
            allowCopying,
          });
          break;

        case 'watermark-pdf':
          output = await addWatermarkToPdf(files[0], {
            text: watermarkText,
            opacity: watermarkOpacity,
            fontSize: watermarkFontSize,
            angle: watermarkAngle,
            color: watermarkColor,
            placement: watermarkPlacement,
          });
          break;

        case 'image-to-pdf':
          output = await imagesToPdf(files, {
            pageSize: imagePageSize,
            orientation: imageOrientation,
          });
          break;

        case 'pdf-to-image':
          output = await pdfToImages(files[0], imageFormat, imageScale);
          break;

        default:
          throw new Error('Unsupported tool operation.');
      }

      setResult(output);

      // Log operation on backend to record user history and decrement free quota
      const logRes = await api.logPdfOperation({
        toolName: tool?.name || 'PDF Operation',
        fileName: files[0].name,
        fileSize: output.fileSize,
        resultSummary: output.summary,
      });

      onUserUpdate(logRes.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed. Please verify the PDF format.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getToolIcon = () => {
    switch (toolId) {
      case 'merge-pdf':
        return <Combine className="w-6 h-6 text-rose-600" />;
      case 'split-pdf':
        return <Split className="w-6 h-6 text-rose-600" />;
      case 'compress-pdf':
        return <Minimize2 className="w-6 h-6 text-rose-600" />;
      case 'protect-pdf':
        return <Lock className="w-6 h-6 text-rose-600" />;
      case 'watermark-pdf':
        return <Stamp className="w-6 h-6 text-rose-600" />;
      case 'image-to-pdf':
        return <FileImage className="w-6 h-6 text-rose-600" />;
      case 'pdf-to-image':
        return <ImageDown className="w-6 h-6 text-rose-600" />;
      default:
        return <FileText className="w-6 h-6 text-rose-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Tools</span>
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            user.plan === 'pro' ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                PRO Member • Unlimited
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Free Quota: {Math.max(0, limits.freePdfLimit - user.pdfOperationsUsed)} left
              </span>
            )
          ) : (
            <button
              onClick={() => onRequireAuth('Please sign in to process files.')}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Sign in to unlock
            </button>
          )}
        </div>
      </div>

      {/* Tool Title & Description */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs mb-3">
          {getToolIcon()}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{tool?.name}</h1>
        <p className="text-slate-600 text-sm mt-1.5">{tool?.description}</p>
      </div>

      {/* Workspace Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload and Files List */}
        <div className="lg:col-span-7 space-y-6">
          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) {
                const dropped = Array.from(e.dataTransfer.files);
                if (isMultiple) {
                  setFiles((prev) => [...prev, ...dropped]);
                } else {
                  setFiles([dropped[0]]);
                }
                setResult(null);
                setError(null);
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/30 rounded-3xl p-8 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={acceptedTypes}
              multiple={isMultiple}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-white shadow-md mx-auto flex items-center justify-center text-slate-400 group-hover:text-rose-600 group-hover:scale-110 transition-all mb-4">
              <Upload className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {files.length > 0
                ? isMultiple
                  ? 'Add more files'
                  : 'Change selected file'
                : `Upload ${toolId === 'image-to-pdf' ? 'Images' : 'PDF'}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Drag &amp; drop {toolId === 'image-to-pdf' ? 'PNG, JPG, or WebP files' : 'your PDF document'} here, or click to browse
            </p>

            <div className="mt-4 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSamplePdf();
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Load Sample PDF</span>
              </button>
            </div>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Selected {files.length === 1 ? 'Document' : `Documents (${files.length})`}
                </span>
                {files.length > 1 && (
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isMultiple && files.length > 1 && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFile(idx, 'up')}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            aria-label="Move file up"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === files.length - 1}
                            onClick={() => moveFile(idx, 'down')}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            aria-label="Move file down"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded-md text-rose-400 hover:text-rose-600 cursor-pointer ml-1"
                        aria-label="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings & Process Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Tool Settings
            </h3>

            {/* Split Settings */}
            {toolId === 'split-pdf' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Split Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitMode('range')}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        splitMode === 'range'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Extract Range
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('all')}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        splitMode === 'all'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Extract All Pages (ZIP)
                    </button>
                  </div>
                </div>

                {splitMode === 'range' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pages to Extract (e.g. 1-2, 4)
                    </label>
                    <input
                      type="text"
                      value={splitRange}
                      onChange={(e) => setSplitRange(e.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter page numbers or intervals separated by commas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Compress Settings */}
            {toolId === 'compress-pdf' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Compression Level</label>
                <div className="space-y-2">
                  {[
                    { id: 'recommended', label: 'Recommended', desc: 'Optimal balance of size & visual fidelity (~50-70% reduction)' },
                    { id: 'extreme', label: 'Extreme Compression', desc: 'Maximum size reduction for email attachments (~70-85%)' },
                    { id: 'light', label: 'Light Compression', desc: 'High quality with subtle optimization (~25-40%)' },
                  ].map((lvl) => (
                    <label
                      key={lvl.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        compressLevel === lvl.id
                          ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="compressLevel"
                        checked={compressLevel === lvl.id}
                        onChange={() => setCompressLevel(lvl.id as 'recommended' | 'extreme' | 'light')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{lvl.label}</div>
                        <div className="text-[11px] text-slate-500">{lvl.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Protect Settings */}
            {toolId === 'protect-pdf' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password"
                      className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      className="rounded-sm text-rose-600 focus:ring-rose-500"
                    />
                    <span>Allow Printing</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      className="rounded-sm text-rose-600 focus:ring-rose-500"
                    />
                    <span>Allow Copying Text &amp; Graphics</span>
                  </label>
                </div>
              </div>
            )}

            {/* Watermark Settings */}
            {toolId === 'watermark-pdf' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL / DRAFT"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Opacity: {Math.round(watermarkOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Font Size: {watermarkFontSize}px
                    </label>
                    <input
                      type="range"
                      min="24"
                      max="72"
                      step="4"
                      value={watermarkFontSize}
                      onChange={(e) => setWatermarkFontSize(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Placement</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['diagonal', 'center', 'top-right', 'bottom-center'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          setWatermarkPlacement(pos);
                          if (pos === 'diagonal') setWatermarkAngle(45);
                          else setWatermarkAngle(0);
                        }}
                        className={`p-2 rounded-lg border capitalize text-center ${
                          watermarkPlacement === pos
                            ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    {[
                      { name: 'Red', color: '#e11d48' },
                      { name: 'Slate', color: '#475569' },
                      { name: 'Blue', color: '#2563eb' },
                      { name: 'Green', color: '#059669' },
                    ].map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setWatermarkColor(c.color)}
                        style={{ backgroundColor: c.color }}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                          watermarkColor === c.color ? 'border-black scale-110' : 'border-transparent'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image to PDF Settings */}
            {toolId === 'image-to-pdf' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Page Sizing</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImagePageSize('fit')}
                      className={`p-2 rounded-lg border text-center ${
                        imagePageSize === 'fit'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Fit to Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePageSize('a4')}
                      className={`p-2 rounded-lg border text-center ${
                        imagePageSize === 'a4'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Standard A4
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PDF to Image Settings */}
            {toolId === 'pdf-to-image' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image Format</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageFormat('png')}
                      className={`p-2 rounded-lg border text-center ${
                        imageFormat === 'png'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      PNG (Lossless)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageFormat('jpeg')}
                      className={`p-2 rounded-lg border text-center ${
                        imageFormat === 'jpeg'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      JPEG (Compact)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageScale(1.0)}
                      className={`p-2 rounded-lg border text-center ${
                        imageScale === 1.0
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Standard (1x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageScale(1.8)}
                      className={`p-2 rounded-lg border text-center ${
                        imageScale === 1.8
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Crisp HD (1.8x)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Merge PDF info */}
            {toolId === 'merge-pdf' && (
              <div className="text-xs text-slate-500">
                <p>Upload 2 or more PDFs. You can reorder the documents on the left before merging.</p>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Process Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing || files.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Process {tool?.name}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Card */}
          {result && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-bold text-emerald-900">Processing Completed!</h4>
              <p className="text-xs text-emerald-800 mt-1">{result.summary}</p>

              {/* Primary Download Button */}
              <a
                href={result.downloadUrl}
                download={result.fileName}
                className="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download {result.fileName}</span>
              </a>

              {/* Multi-file list if split or pdf-to-image */}
              {result.extraFiles && result.extraFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-emerald-200/60 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase">
                      Individual Pages ({result.extraFiles.length})
                    </span>
                    <a
                      href={result.downloadUrl}
                      download={result.fileName}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <FolderArchive className="w-3 h-3" />
                      Download ZIP
                    </a>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {result.extraFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-emerald-100 text-xs"
                      >
                        <span className="truncate max-w-[160px] font-medium text-slate-700">{f.name}</span>
                        <a
                          href={f.url}
                          download={f.name}
                          className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Save
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
