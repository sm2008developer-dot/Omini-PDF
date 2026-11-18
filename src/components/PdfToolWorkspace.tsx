/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Maximize2,
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
  FileEdit,
  RotateCw,
  Hash,
  ExternalLink,
  Highlighter,
  Scaling,
  SlidersHorizontal,
  Eraser,
  Wand2,
  PenLine,
  FlipHorizontal2,
  FlipVertical2,
} from 'lucide-react';
import { ToolId, TOOLS_CONFIG } from '../types.js';
import { User, PlatformLimits, api } from '../utils/api.js';
import { AdSenseBanner } from './AdSenseBanner.js';
import {
  mergePdfFiles,
  splitPdfFile,
  compressPdfFile,
  protectPdfFile,
  addWatermarkToPdf,
  imagesToPdf,
  pdfToImages,
  getPdfMetadata,
  editPdfMetadata,
  rotatePdfFile,
  addPageNumbersToPdf,
  removePagesFromPdf,
  annotatePdfFile,
  getPdfPageCount,
  PdfAnnotation,
  ProcessedPdfResult,
} from '../utils/pdfEngine.js';
import {
  compressImageFile,
  resizeAndConvertImage,
  editPhotoFile,
  highlightPhotoFile,
  removeBackgroundAlgorithmic,
  enhancePhotoAlgorithmic,
  renameFilesClient,
  generateSamplePhotoFile,
  ImageOutputFormat,
  PhotoFilterPreset,
  PhotoHighlightItem,
} from '../utils/imageEngine.js';
import {
  buildBatchRenamePlan,
  NormalizedBrushStroke,
  NormalizedCropRect,
  RgbColor,
} from '../utils/imageMath.js';
import {
  addLocalHistoryItem,
  cacheSessionHistoryFile,
} from '../utils/historyStore.js';
import { PdfPreviewModal } from './PdfPreviewModal.js';
import { PdfCanvasViewer } from './PdfCanvasViewer.js';
import { MonetagDownloadLink } from './MonetagDownloadLink.js';
import { InteractivePdfHighlightPanel } from './InteractivePdfHighlightPanel.js';
import { InteractivePhotoPanel } from './InteractivePhotoPanel.js';

interface PdfToolWorkspaceProps {
  toolId: ToolId;
  user: User | null;
  limits: PlatformLimits;
  onBack: () => void;
  onOpenHistory?: () => void;
  onRequireAuth: (reason: string) => void;
  onRequireUpgrade: (reason: string) => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const PdfToolWorkspace: React.FC<PdfToolWorkspaceProps> = ({
  toolId,
  user,
  limits,
  onBack,
  onOpenHistory,
  onRequireAuth,
  onRequireUpgrade,
  onUserUpdate,
}) => {
  const tool = TOOLS_CONFIG.find((t) => t.id === toolId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files state
  const [files, setFiles] = useState<File[]>([]);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedPdfResult | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{
    file?: File | Blob | null;
    fileUrl?: string;
    name: string;
    downloadUrl?: string;
    extraFiles?: ProcessedPdfResult['extraFiles'];
  } | null>(null);
  const [showResultInlinePreview, setShowResultInlinePreview] = useState(true);

  // Tool-specific configurations
  // 1. Split
  const [splitMode, setSplitMode] = useState<'all' | 'range'>('range');
  const [splitRange, setSplitRange] = useState('1-2');

  // 2. Compress PDF
  const [compressLevel, setCompressLevel] = useState<'recommended' | 'extreme' | 'light' | 'target-kb'>('recommended');
  const [pdfTargetKb, setPdfTargetKb] = useState<number>(150);

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
  const [imageOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  // 6. PDF to Image
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageScale, setImageScale] = useState(1.5);

  // 7. Edit Metadata
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [metaCreator, setMetaCreator] = useState('Omini PDF');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // 8. Rotate PDF
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [rotateRange, setRotateRange] = useState('');

  // 9. Page Numbers
  const [pageNumberPos, setPageNumberPos] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState<'page-of-total' | 'simple'>('page-of-total');
  const [pageNumberFontSize, setPageNumberFontSize] = useState(10);

  // 10. Remove Pages
  const [pagesToRemove, setPagesToRemove] = useState('1');

  // 11. PDF Highlight & Edit
  const [pdfAnnotations, setPdfAnnotations] = useState<PdfAnnotation[]>([]);

  // 12. Compress Photo (PNG/JPG/WebP)
  const [imgCompressFormat, setImgCompressFormat] = useState<ImageOutputFormat>('webp');
  const [imgCompressMode, setImgCompressMode] = useState<'quality' | 'target-kb'>('quality');
  const [imgCompressQuality, setImgCompressQuality] = useState<number>(78);
  const [imgTargetKb, setImgTargetKb] = useState<number>(100);
  const [imgMaxWidth, setImgMaxWidth] = useState<string>('');

  // 13. Resize / Aspect Ratio & Format Converter
  const [resizeRatio, setResizeRatio] = useState<string>('1:1');
  const [resizeCustomW, setResizeCustomW] = useState<number>(1080);
  const [resizeCustomH, setResizeCustomH] = useState<number>(1080);
  const [resizeMode, setResizeMode] = useState<'crop' | 'fit' | 'stretch'>('crop');
  const [resizeFormat, setResizeFormat] = useState<ImageOutputFormat>('png');
  const [resizeBgColor, setResizeBgColor] = useState<string>('#ffffff');

  // 14. Edit Photo (Crop, Rotate, Flip, Filters)
  const [editCrop, setEditCrop] = useState<NormalizedCropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [editRotate, setEditRotate] = useState<0 | 90 | 180 | 270>(0);
  const [editFlipH, setEditFlipH] = useState(false);
  const [editFlipV, setEditFlipV] = useState(false);
  const [editPreset, setEditPreset] = useState<PhotoFilterPreset>('original');
  const [editBrightness, setEditBrightness] = useState<number>(0);
  const [editContrast, setEditContrast] = useState<number>(0);
  const [editSaturation, setEditSaturation] = useState<number>(0);
  const [editFormat, setEditFormat] = useState<ImageOutputFormat>('png');

  // 15. Highlight Photo
  const [photoHighlights, setPhotoHighlights] = useState<PhotoHighlightItem[]>([]);
  const [photoHlFormat, setPhotoHlFormat] = useState<ImageOutputFormat>('png');

  // 16. Remove Background (Pure Algorithmic Edge-Barrier Flood-Fill + Chroma Key + Brush Masks)
  const [bgMode, setBgMode] = useState<'flood-edges' | 'global-color'>('flood-edges');
  const [bgTolerance, setBgTolerance] = useState<number>(38);
  const [bgFeather, setBgFeather] = useState<number>(10);
  const [bgEdgeBarrier, setBgEdgeBarrier] = useState<boolean>(true);
  const [bgSampleColors, setBgSampleColors] = useState<RgbColor[]>([]);
  const [bgKeepStrokes, setBgKeepStrokes] = useState<NormalizedBrushStroke[]>([]);
  const [bgEraseStrokes, setBgEraseStrokes] = useState<NormalizedBrushStroke[]>([]);
  const [bgFill, setBgFill] = useState<string>('transparent');
  const [bgFormat, setBgFormat] = useState<ImageOutputFormat>('png');

  // 17. Enhance Photo (Adaptive Auto-Levels + Multi-Pixel Unsharp Mask)
  const [enhancePreset, setEnhancePreset] = useState<'auto' | 'document' | 'portrait' | 'vivid' | 'custom'>('auto');
  const [enhanceSharpen, setEnhanceSharpen] = useState<number>(62);
  const [enhanceContrast, setEnhanceContrast] = useState<number>(70);
  const [enhanceBrightness, setEnhanceBrightness] = useState<number>(4);
  const [enhanceVibrance, setEnhanceVibrance] = useState<number>(40);
  const [enhanceDenoise, setEnhanceDenoise] = useState<number>(12);
  const [enhanceFormat, setEnhanceFormat] = useState<ImageOutputFormat>('png');

  // 18. Rename PDF & Photos
  const [renameBaseName, setRenameBaseName] = useState('');
  const [renamePrefix, setRenamePrefix] = useState('');
  const [renameSuffix, setRenameSuffix] = useState('');
  const [renameNumbering, setRenameNumbering] = useState<'none' | 'suffix' | 'prefix'>('suffix');
  const [renameStartNum, setRenameStartNum] = useState<number>(1);
  const [renameFind, setRenameFind] = useState('');
  const [renameReplace, setRenameReplace] = useState('');
  const [renameCasing, setRenameCasing] = useState<'keep' | 'lower' | 'slug'>('keep');

  // Reset active workspace files & annotations cleanly whenever switching tools
  useEffect(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setPdfAnnotations([]);
    setPhotoHighlights([]);
    setBgSampleColors([]);
    setBgKeepStrokes([]);
    setBgEraseStrokes([]);
    setEditCrop({ x: 0, y: 0, w: 1, h: 1 });
    setEditRotate(0);
    setEditFlipH(false);
    setEditFlipV(false);
    setEditPreset('original');
    setEditBrightness(0);
    setEditContrast(0);
    setEditSaturation(0);
  }, [toolId]);

  // Automatically read and pre-fill document metadata when a PDF is selected in edit-metadata mode
  useEffect(() => {
    if (toolId === 'edit-metadata' && files.length > 0) {
      let isMounted = true;
      setIsLoadingMetadata(true);
      getPdfMetadata(files[0])
        .then((data) => {
          if (!isMounted) return;
          setMetaTitle(data.title || files[0].name.replace(/\.pdf$/i, ''));
          setMetaAuthor(data.author || (user?.name || ''));
          setMetaSubject(data.subject || '');
          setMetaKeywords(data.keywords || '');
          setMetaCreator(data.creator || 'Omini PDF');
        })
        .catch((err) => {
          console.warn('Failed reading metadata:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingMetadata(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [files, toolId, user]);

  // Read page counts automatically for uploaded PDFs
  useEffect(() => {
    let cancelled = false;
    const pdfs = files.filter(
      (f) => f.type.includes('pdf') || /\.pdf$/i.test(f.name)
    );
    if (pdfs.length === 0) {
      setPdfPageCounts({});
      return;
    }
    Promise.all(
      pdfs.map(async (f) => {
        const key = `${f.name}_${f.size}`;
        const count = await getPdfPageCount(f).catch(() => 0);
        return [key, count] as const;
      })
    ).then((entries) => {
      if (!cancelled) {
        const next: Record<string, number> = {};
        for (const [k, c] of entries) {
          if (c > 0) next[k] = c;
        }
        setPdfPageCounts(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [files]);

  const isPhotoOnlyTool =
    toolId === 'image-to-pdf' ||
    toolId === 'compress-image' ||
    toolId === 'resize-image' ||
    toolId === 'edit-photo' ||
    toolId === 'highlight-photo' ||
    toolId === 'remove-bg' ||
    toolId === 'enhance-photo';

  const isMultiple = toolId === 'merge-pdf' || toolId === 'image-to-pdf' || toolId === 'rename-files';
  const acceptedTypes =
    toolId === 'rename-files'
      ? '.pdf,application/pdf,image/*'
      : isPhotoOnlyTool
      ? 'image/*'
      : '.pdf,application/pdf';

  const isFileValidForTool = (f: File): boolean => {
    const mime = (f.type || '').toLowerCase();
    const name = f.name.toLowerCase();
    const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
    const isImg =
      mime.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(name);
    if (toolId === 'rename-files') return isPdf || isImg;
    if (isPhotoOnlyTool) return isImg;
    return isPdf;
  };

  const acceptIncomingFiles = (incoming: File[]) => {
    const valid = incoming.filter(isFileValidForTool);
    if (valid.length === 0) {
      setError(
        toolId === 'rename-files'
          ? 'Unsupported file type. Please upload PDF, PNG, JPG, or WebP files.'
          : isPhotoOnlyTool
          ? 'Please upload a valid PNG, JPG, or WebP image file.'
          : 'Please upload a valid PDF (.pdf) document.'
      );
      return;
    }
    if (isMultiple) {
      setFiles((prev) => [...prev, ...valid]);
    } else {
      setFiles([valid[0]]);
      setPdfAnnotations([]);
      setPhotoHighlights([]);
      setBgSampleColors([]);
      setBgKeepStrokes([]);
      setBgEraseStrokes([]);
    }
    setResult(null);
    setError(
      valid.length < incoming.length
        ? 'Skipped unsupported files — only matching PDF/Image files were added.'
        : null
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    acceptIncomingFiles(Array.from(e.target.files));
    e.target.value = '';
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

  // Generate a crisp sample file directly in the browser (Photos for photo tools, mixed for rename, PDF otherwise)
  const loadSamplePdf = async () => {
    try {
      if (toolId === 'compress-image' || toolId === 'resize-image' || toolId === 'edit-photo' || toolId === 'remove-bg') {
        const samplePhoto = await generateSamplePhotoFile('studio');
        setFiles([samplePhoto]);
        setResult(null);
        setError(null);
        return;
      }

      if (toolId === 'highlight-photo' || toolId === 'enhance-photo') {
        const sampleDocPhoto = await generateSamplePhotoFile('document');
        setFiles([sampleDocPhoto]);
        setResult(null);
        setError(null);
        return;
      }

      if (toolId === 'rename-files') {
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const page = doc.addPage([595.28, 841.89]);
        page.drawText('Omini PDF Sample Contract', { x: 50, y: 760, size: 18, font, color: rgb(0.91, 0.24, 0.55) });
        const pdfBytes = await doc.save();
        const pdfFile = new File([new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })], 'raw scan 001.pdf', {
          type: 'application/pdf',
        });
        const imgFile = await generateSamplePhotoFile('studio');
        setFiles([pdfFile, imgFile]);
        setResult(null);
        setError(null);
        return;
      }

      if (toolId === 'image-to-pdf') {
        const makeSampleImage = (index: number, accentHex: string): Promise<File> =>
          new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 794;
            canvas.height = 1123;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#FFF4F8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(48, 48, canvas.width - 96, canvas.height - 96);
            ctx.strokeStyle = accentHex;
            ctx.lineWidth = 4;
            ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);
            ctx.fillStyle = accentHex;
            ctx.font = 'bold 34px Georgia, serif';
            ctx.fillText(`Omini PDF Sample Scan ${index}`, 90, 140);
            ctx.fillStyle = '#24212A';
            ctx.font = '22px Georgia, serif';
            ctx.fillText(`High-Resolution Sample Image #${index} (Ready for PDF Conversion)`, 90, 200);
            ctx.fillStyle = '#77717B';
            ctx.font = '18px sans-serif';
            ctx.fillText(`Dimensions: 794 x 1123 px (A4 Aspect Ratio)`, 90, 250);
            canvas.toBlob((blob) => {
              resolve(new File([blob || new Blob()], `Sample_Scan_${index}.png`, { type: 'image/png' }));
            }, 'image/png');
          });
        const [img1, img2] = await Promise.all([
          makeSampleImage(1, '#E83E8C'),
          makeSampleImage(2, '#C92B72'),
        ]);
        setFiles([img1, img2]);
        setResult(null);
        setError(null);
        return;
      }

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
    // Validate Inputs (100% Free & Unlimited — no login or quota block)
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
          output = await compressPdfFile(files[0], compressLevel, pdfTargetKb);
          break;

        case 'highlight-pdf':
          output = await annotatePdfFile(files[0], pdfAnnotations);
          break;

        case 'compress-image':
          output = await compressImageFile(files[0], {
            format: imgCompressFormat,
            quality: imgCompressQuality / 100,
            targetKb: imgCompressMode === 'target-kb' ? imgTargetKb : null,
            maxWidth: imgMaxWidth.trim() ? parseInt(imgMaxWidth, 10) : null,
          });
          break;

        case 'resize-image':
          output = await resizeAndConvertImage(files[0], {
            ratio: resizeRatio,
            customWidth: resizeCustomW,
            customHeight: resizeCustomH,
            mode: resizeMode,
            format: resizeFormat,
            backgroundColor: resizeBgColor,
          });
          break;

        case 'edit-photo':
          output = await editPhotoFile(files[0], {
            crop: editCrop,
            rotate: editRotate,
            flipH: editFlipH,
            flipV: editFlipV,
            preset: editPreset,
            brightness: editBrightness,
            contrast: editContrast,
            saturation: editSaturation,
            format: editFormat,
          });
          break;

        case 'highlight-photo':
          if (photoHighlights.length === 0) {
            throw new Error('Please draw a highlight/spotlight on the photo or click "Quick" first.');
          }
          output = await highlightPhotoFile(files[0], {
            annotations: photoHighlights,
            format: photoHlFormat,
          });
          break;

        case 'remove-bg':
          output = await removeBackgroundAlgorithmic(files[0], {
            tolerance: bgTolerance,
            feather: bgFeather,
            mode: bgMode,
            edgeBarrier: bgEdgeBarrier,
            sampleColors: bgSampleColors.length > 0 ? bgSampleColors : undefined,
            keepStrokes: bgKeepStrokes,
            eraseStrokes: bgEraseStrokes,
            bgFill,
            format: bgFormat,
          });
          break;

        case 'enhance-photo':
          output = await enhancePhotoAlgorithmic(files[0], {
            preset: enhancePreset,
            sharpen: enhanceSharpen,
            autoContrast: enhanceContrast,
            brightness: enhanceBrightness,
            vibrance: enhanceVibrance,
            denoise: enhanceDenoise,
            format: enhanceFormat,
          });
          break;

        case 'rename-files':
          output = await renameFilesClient(files, {
            baseName: renameBaseName,
            prefix: renamePrefix,
            suffix: renameSuffix,
            numbering: renameNumbering,
            startNumber: renameStartNum,
            findText: renameFind,
            replaceText: renameReplace,
            casing: renameCasing,
          });
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

        case 'edit-metadata':
        case 'edit-pdf-metadata' as unknown as ToolId:
          output = await editPdfMetadata(files[0], {
            title: metaTitle,
            author: metaAuthor,
            subject: metaSubject,
            keywords: metaKeywords,
            creator: metaCreator,
          });
          break;

        case 'rotate-pdf':
          output = await rotatePdfFile(files[0], rotateAngle, rotateRange);
          break;

        case 'page-numbers':
          output = await addPageNumbersToPdf(files[0], {
            position: pageNumberPos,
            format: pageNumberFormat,
            fontSize: pageNumberFontSize,
          });
          break;

        case 'remove-pages':
          output = await removePagesFromPdf(files[0], pagesToRemove);
          break;

        default:
          throw new Error('Unsupported tool operation.');
      }

      setResult(output);

      // Save to persistent browser History + in-session file cache for all users
      const inputSummaryName =
        files.length > 1 ? `${files[0].name} (+${files.length - 1} more)` : files[0].name;
      const savedEntry = addLocalHistoryItem({
        userId: user?.id || 'guest',
        toolId,
        toolName: tool?.name || 'PDF Operation',
        fileName: inputSummaryName,
        outputFileName: output.fileName,
        fileSize: output.fileSize,
        pageCount: output.pageCount,
        resultSummary: output.summary,
      });
      cacheSessionHistoryFile(savedEntry.id, {
        blob: output.blob,
        downloadUrl: output.downloadUrl,
        fileName: output.fileName,
      });

      // 1. Sync operation to Firebase Firestore only when signed in
      if (user?.id) {
        import('../lib/firebaseService.js')
          .then(({ logPdfOperationInFirestore }) =>
            logPdfOperationInFirestore(user.id, {
              toolName: tool?.name || 'PDF Operation',
              fileName: files[0].name,
              fileSize: output.fileSize,
              resultSummary: output.summary,
            })
          )
          .then((fRes) => {
            if (fRes?.user) onUserUpdate(fRes.user);
          })
          .catch((err) => {
            console.warn('Firestore log notice:', err);
          });
      }

      // 2. Also log operation on backend if signed in
      if (user?.id) {
        const logRes = await api.logPdfOperation({
          toolName: tool?.name || 'PDF Operation',
          fileName: files[0].name,
          fileSize: output.fileSize,
          resultSummary: output.summary,
        }).catch(() => null);

        if (logRes?.user) {
          onUserUpdate(logRes.user);
        }
      }
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
      case 'compress-image':
        return <Minimize2 className="w-6 h-6 text-rose-600" />;
      case 'protect-pdf':
        return <Lock className="w-6 h-6 text-rose-600" />;
      case 'watermark-pdf':
        return <Stamp className="w-6 h-6 text-rose-600" />;
      case 'image-to-pdf':
        return <FileImage className="w-6 h-6 text-rose-600" />;
      case 'pdf-to-image':
        return <ImageDown className="w-6 h-6 text-rose-600" />;
      case 'edit-metadata':
        return <FileEdit className="w-6 h-6 text-rose-600" />;
      case 'rotate-pdf':
        return <RotateCw className="w-6 h-6 text-rose-600" />;
      case 'page-numbers':
        return <Hash className="w-6 h-6 text-rose-600" />;
      case 'remove-pages':
        return <Trash2 className="w-6 h-6 text-rose-600" />;
      case 'highlight-pdf':
      case 'highlight-photo':
        return <Highlighter className="w-6 h-6 text-rose-600" />;
      case 'resize-image':
        return <Scaling className="w-6 h-6 text-rose-600" />;
      case 'edit-photo':
        return <SlidersHorizontal className="w-6 h-6 text-rose-600" />;
      case 'remove-bg':
        return <Eraser className="w-6 h-6 text-rose-600" />;
      case 'enhance-photo':
        return <Wand2 className="w-6 h-6 text-rose-600" />;
      case 'rename-files':
        return <PenLine className="w-6 h-6 text-rose-600" />;
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
          <span className="text-xs font-bold text-[#1FA971] bg-[#1FA971]/10 px-3 py-1 rounded-full border border-[#1FA971]/25">
            100% Free • Unlimited Operations
          </span>
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
                acceptIncomingFiles(Array.from(e.dataTransfer.files));
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
                : toolId === 'rename-files'
                ? 'Upload PDF or Photo Files'
                : isPhotoOnlyTool
                ? 'Upload Photo (PNG, JPG, WebP)'
                : 'Upload PDF'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Drag &amp; drop{' '}
              {toolId === 'rename-files'
                ? 'PDF, PNG, JPG, or WebP files'
                : isPhotoOnlyTool
                ? 'PNG, JPG, or WebP files'
                : 'your PDF document'}{' '}
              here, or click to browse
            </p>

            <div className="mt-4 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSamplePdf();
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {toolId === 'rename-files'
                    ? 'Load Sample Files'
                    : toolId === 'image-to-pdf'
                    ? 'Load Sample Images'
                    : isPhotoOnlyTool
                    ? 'Load Sample Photo'
                    : 'Load Sample PDF'}
                </span>
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
                        <p className="text-[11px] text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                          {pdfPageCounts[`${file.name}_${file.size}`]
                            ? ` • ${pdfPageCounts[`${file.name}_${file.size}`]} page${
                                pdfPageCounts[`${file.name}_${file.size}`] === 1 ? '' : 's'
                              }`
                            : ''}
                        </p>
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
                        onClick={() => setPreviewTarget({ file, name: file.name })}
                        className="px-2 py-1 rounded-md text-[#E83E8C] bg-[#FFF4F8] border border-[#FFE3EE] hover:bg-[#FFE3EE] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        title={`Preview ${file.name}`}
                        aria-label={`Preview ${file.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Preview</span>
                      </button>
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

          {/* Interactive PDF Highlight Canvas (only for highlight-pdf) */}
          {toolId === 'highlight-pdf' && files.length > 0 && (
            <InteractivePdfHighlightPanel
              file={files[0]}
              annotations={pdfAnnotations}
              onChangeAnnotations={setPdfAnnotations}
            />
          )}

          {/* Interactive Photo Studio Canvas (live preview across all photo tools) */}
          {files.length > 0 &&
            (toolId === 'compress-image' ||
              toolId === 'resize-image' ||
              toolId === 'edit-photo' ||
              toolId === 'highlight-photo' ||
              toolId === 'remove-bg' ||
              toolId === 'enhance-photo') && (
              <InteractivePhotoPanel
                toolId={toolId}
                file={files[0]}
                compressFormat={imgCompressFormat}
                compressQuality={imgCompressQuality}
                compressTargetKb={imgCompressMode === 'target-kb' ? imgTargetKb : null}
                resizeRatio={resizeRatio}
                resizeCustomW={resizeCustomW}
                resizeCustomH={resizeCustomH}
                resizeMode={resizeMode}
                resizeBgColor={resizeBgColor}
                cropRect={editCrop}
                onChangeCropRect={setEditCrop}
                rotateDeg={editRotate}
                flipH={editFlipH}
                flipV={editFlipV}
                filterPreset={editPreset}
                brightness={editBrightness}
                contrast={editContrast}
                saturation={editSaturation}
                highlights={photoHighlights}
                onChangeHighlights={setPhotoHighlights}
                bgTolerance={bgTolerance}
                bgFeather={bgFeather}
                bgMode={bgMode}
                bgEdgeBarrier={bgEdgeBarrier}
                bgSampleColors={bgSampleColors}
                onChangeBgSampleColors={setBgSampleColors}
                bgKeepStrokes={bgKeepStrokes}
                onChangeBgKeepStrokes={setBgKeepStrokes}
                bgEraseStrokes={bgEraseStrokes}
                onChangeBgEraseStrokes={setBgEraseStrokes}
                bgFill={bgFill}
                enhancePreset={enhancePreset}
                enhanceSharpen={enhanceSharpen}
                enhanceContrast={enhanceContrast}
                enhanceBrightness={enhanceBrightness}
                enhanceVibrance={enhanceVibrance}
                enhanceDenoise={enhanceDenoise}
              />
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

            {/* Compress PDF Settings */}
            {toolId === 'compress-pdf' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Compression Level</label>
                <div className="space-y-2">
                  {[
                    { id: 'recommended', label: 'Recommended (Lossless)', desc: 'Clean PDF stream & metadata optimization preserving sharp vector text' },
                    { id: 'extreme', label: 'Extreme Deep Compression', desc: 'Raster JPEG re-encoding for heavy scans (~65–85% smaller)' },
                    { id: 'target-kb', label: 'Target File Size (KB)', desc: 'Automatically optimize DPI & JPEG quality toward your KB goal' },
                    { id: 'light', label: 'Light Compression', desc: 'Subtle object-stream cleanup preserving full quality' },
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
                        onChange={() =>
                          setCompressLevel(lvl.id as 'recommended' | 'extreme' | 'light' | 'target-kb')
                        }
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{lvl.label}</div>
                        <div className="text-[11px] text-slate-500">{lvl.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {compressLevel === 'target-kb' && (
                  <div className="p-3 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {[100, 200, 500].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setPdfTargetKb(kb)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                            pdfTargetKb === kb
                              ? 'bg-[#E83E8C] text-white border-[#C92B72]'
                              : 'bg-white text-[#24212A] border-[#FFE3EE]'
                          }`}
                        >
                          {kb} KB
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        Custom KB:
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={10000}
                        value={pdfTargetKb}
                        onChange={(e) => setPdfTargetKb(Math.max(20, parseInt(e.target.value, 10) || 100))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-[#E83E8C]"
                      />
                    </div>
                  </div>
                )}
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

            {/* Edit Metadata Settings */}
            {toolId === 'edit-metadata' && (
              <div className="space-y-3.5">
                {isLoadingMetadata && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reading current PDF metadata properties...</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g. Official Annual Report 2026"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author / Organization</label>
                  <input
                    type="text"
                    value={metaAuthor}
                    onChange={(e) => setMetaAuthor(e.target.value)}
                    placeholder="e.g. Sanjib Mukherjee"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Description</label>
                  <input
                    type="text"
                    value={metaSubject}
                    onChange={(e) => setMetaSubject(e.target.value)}
                    placeholder="e.g. Academic Exam Result / Marks Verification"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keywords (Comma-separated)</label>
                  <input
                    type="text"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="e.g. result, exam, 2026, verification"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Creator Application</label>
                  <input
                    type="text"
                    value={metaCreator}
                    onChange={(e) => setMetaCreator(e.target.value)}
                    placeholder="e.g. Omini PDF Suite"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMetaTitle('');
                      setMetaAuthor('');
                      setMetaSubject('');
                      setMetaKeywords('');
                      setMetaCreator('Omini PDF');
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear All Fields
                  </button>
                </div>
              </div>
            )}

            {/* Rotate PDF Settings */}
            {toolId === 'rotate-pdf' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Rotation Angle</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { deg: 90 as const, label: '90° Clockwise' },
                      { deg: 180 as const, label: '180° Flip' },
                      { deg: 270 as const, label: '270° (90° CCW)' },
                    ].map((item) => (
                      <button
                        key={item.deg}
                        type="button"
                        onClick={() => setRotateAngle(item.deg)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          rotateAngle === item.deg
                            ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pages to Rotate (Leave empty for All Pages)
                  </label>
                  <input
                    type="text"
                    value={rotateRange}
                    onChange={(e) => setRotateRange(e.target.value)}
                    placeholder="e.g. 1, 3-5 or leave empty for all"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}

            {/* Page Numbers Settings */}
            {toolId === 'page-numbers' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Position</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { pos: 'bottom-center' as const, label: 'Bottom Center' },
                      { pos: 'bottom-right' as const, label: 'Bottom Right' },
                      { pos: 'top-right' as const, label: 'Top Right' },
                    ].map((item) => (
                      <button
                        key={item.pos}
                        type="button"
                        onClick={() => setPageNumberPos(item.pos)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          pageNumberPos === item.pos
                            ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Format</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPageNumberFormat('page-of-total')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        pageNumberFormat === 'page-of-total'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      "Page 1 of N"
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageNumberFormat('simple')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        pageNumberFormat === 'simple'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      "1" (Number only)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Font Size: {pageNumberFontSize}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="14"
                    step="1"
                    value={pageNumberFontSize}
                    onChange={(e) => setPageNumberFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600"
                  />
                </div>
              </div>
            )}

            {/* Remove Pages Settings */}
            {toolId === 'remove-pages' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pages to Delete (e.g. 1, 3-5)
                </label>
                <input
                  type="text"
                  value={pagesToRemove}
                  onChange={(e) => setPagesToRemove(e.target.value)}
                  placeholder="e.g. 1, 3-5"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-slate-500">
                  Specify 1-based page numbers or intervals to permanently remove from the document.
                </p>
              </div>
            )}

            {/* PDF Edit & Highlight Settings */}
            {toolId === 'highlight-pdf' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] text-[#24212A] space-y-1">
                  <p className="font-bold">How to Highlight &amp; Edit PDF:</p>
                  <p className="text-[11px] text-[#77717B]">
                    Upload or load a PDF on the left, then drag across any line or tap <strong>Quick Mark</strong> to draw permanent highlights or text notes onto the page.
                  </p>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-700">Active Highlights / Notes:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFE3EE] text-[#C92B72] font-bold">
                    {pdfAnnotations.length}
                  </span>
                </div>
              </div>
            )}

            {/* Compress Photo (PNG/JPG/WebP) Settings */}
            {toolId === 'compress-image' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Output Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['webp', 'jpeg', 'png'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setImgCompressFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          imgCompressFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Compression Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImgCompressMode('quality')}
                      className={`p-2 rounded-xl border font-bold cursor-pointer ${
                        imgCompressMode === 'quality'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Quality Slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgCompressMode('target-kb')}
                      className={`p-2 rounded-xl border font-bold cursor-pointer ${
                        imgCompressMode === 'target-kb'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Exact Target KB
                    </button>
                  </div>
                </div>

                {imgCompressMode === 'quality' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quality: {imgCompressQuality}%
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={98}
                      value={imgCompressQuality}
                      onChange={(e) => setImgCompressQuality(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] space-y-2">
                    <label className="block font-bold text-[#24212A]">Target File Size (KB)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[20, 50, 100, 200].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setImgTargetKb(kb)}
                          className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                            imgTargetKb === kb
                              ? 'bg-[#E83E8C] text-white border-[#C92B72]'
                              : 'bg-white text-[#24212A] border-[#FFE3EE]'
                          }`}
                        >
                          {kb} KB
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={5}
                      max={5000}
                      value={imgTargetKb}
                      onChange={(e) => setImgTargetKb(Math.max(5, parseInt(e.target.value, 10) || 50))}
                      placeholder="Custom target KB"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Max Width (px, optional)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={8000}
                    value={imgMaxWidth}
                    onChange={(e) => setImgMaxWidth(e.target.value)}
                    placeholder="Keep original width"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E83E8C]"
                  />
                </div>
              </div>
            )}

            {/* Resize / Aspect Ratio & Format Converter Settings */}
            {toolId === 'resize-image' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Aspect Ratio</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Original', '1:1', '4:3', '16:9', '9:16', '3:2', '3:4', 'custom'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResizeRatio(r)}
                        className={`p-2 rounded-lg border font-bold cursor-pointer ${
                          resizeRatio === r
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {r === 'custom' ? 'Custom' : r}
                      </button>
                    ))}
                  </div>
                </div>

                {resizeRatio === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Width (px)</label>
                      <input
                        type="number"
                        min={16}
                        max={6000}
                        value={resizeCustomW}
                        onChange={(e) => setResizeCustomW(Math.max(16, parseInt(e.target.value, 10) || 800))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Height (px)</label>
                      <input
                        type="number"
                        min={16}
                        max={6000}
                        value={resizeCustomH}
                        onChange={(e) => setResizeCustomH(Math.max(16, parseInt(e.target.value, 10) || 800))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Fit Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'crop' as const, label: 'Crop to Fill' },
                      { id: 'fit' as const, label: 'Fit (Pad)' },
                      { id: 'stretch' as const, label: 'Stretch' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setResizeMode(m.id)}
                        className={`p-2 rounded-xl border font-bold cursor-pointer ${
                          resizeMode === m.id
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {resizeMode === 'fit' && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Padding Color:</span>
                    <input
                      type="color"
                      value={resizeBgColor}
                      onChange={(e) => setResizeBgColor(e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer border border-slate-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Download Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setResizeFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          resizeFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Edit Photo Settings */}
            {toolId === 'edit-photo' && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRotate((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-400 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-rose-600" />
                    Rotate ({editRotate}°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFlipH((v) => !v)}
                    className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1 cursor-pointer ${
                      editFlipH ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200'
                    }`}
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                    Flip H
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFlipV((v) => !v)}
                    className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1 cursor-pointer ${
                      editFlipV ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200'
                    }`}
                  >
                    <FlipVertical2 className="w-3.5 h-3.5" />
                    Flip V
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Filter Presets (16 Looks)</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'original', label: 'Original' },
                        { id: 'vivid', label: 'Vivid' },
                        { id: 'warm', label: 'Warm' },
                        { id: 'cool', label: 'Cool' },
                        { id: 'golden-hour', label: 'Golden Hr' },
                        { id: 'cinematic', label: 'Cinematic' },
                        { id: 'rose-glow', label: 'Rose Glow' },
                        { id: 'emerald', label: 'Emerald' },
                        { id: 'fade', label: 'Soft Fade' },
                        { id: 'vintage', label: 'Vintage' },
                        { id: 'sepia', label: 'Sepia' },
                        { id: 'bw', label: 'B&W' },
                        { id: 'noir', label: 'Film Noir' },
                        { id: 'high-contrast', label: 'Contrast+' },
                        { id: 'hdr-crisp', label: 'HDR Crisp' },
                        { id: 'invert', label: 'Invert' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditPreset(p.id)}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          editPreset === p.id
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Brightness: {editBrightness}
                    </label>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      value={editBrightness}
                      onChange={(e) => setEditBrightness(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Contrast: {editContrast}
                    </label>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      value={editContrast}
                      onChange={(e) => setEditContrast(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Saturation: {editSaturation}
                    </label>
                    <input
                      type="range"
                      min={-80}
                      max={80}
                      value={editSaturation}
                      onChange={(e) => setEditSaturation(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#77717B]">
                    Crop region: {Math.round(editCrop.w * 100)}% × {Math.round(editCrop.h * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditCrop({ x: 0, y: 0, w: 1, h: 1 });
                      setEditRotate(0);
                      setEditFlipH(false);
                      setEditFlipV(false);
                      setEditPreset('original');
                      setEditBrightness(0);
                      setEditContrast(0);
                      setEditSaturation(0);
                    }}
                    className="text-[11px] font-bold text-[#E83E8C] hover:underline cursor-pointer"
                  >
                    Reset Crop &amp; Filters
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setEditFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          editFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Highlight Photo Settings */}
            {toolId === 'highlight-photo' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] text-[#24212A] space-y-1">
                  <p className="font-bold">Highlight &amp; Spotlight Canvas Ready</p>
                  <p className="text-[11px] text-[#77717B]">
                    Choose <strong>Box</strong>, <strong>Spotlight</strong>, or <strong>Marker</strong> on the left studio and draw directly over the photo (or tap <strong>Quick</strong>).
                  </p>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-700">Active Photo Highlights:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFE3EE] text-[#C92B72] font-bold">
                    {photoHighlights.length}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setPhotoHlFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          photoHlFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Remove Background Settings (Algorithmic Flood-Fill + Chroma Key) */}
            {toolId === 'remove-bg' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Detection Mode (No AI)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBgMode('flood-edges')}
                      className={`p-2 rounded-xl border font-bold cursor-pointer ${
                        bgMode === 'flood-edges'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Edge Flood-Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('global-color')}
                      className={`p-2 rounded-xl border font-bold cursor-pointer ${
                        bgMode === 'global-color'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Global Chroma Key
                    </button>
                  </div>
                </div>

                {bgMode === 'flood-edges' && (
                  <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] cursor-pointer">
                    <span className="font-semibold text-[#24212A]">Edge Shield (Stop at subject outlines)</span>
                    <input
                      type="checkbox"
                      checked={bgEdgeBarrier}
                      onChange={(e) => setBgEdgeBarrier(e.target.checked)}
                      className="accent-rose-600 w-4 h-4"
                    />
                  </label>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Color Tolerance: {bgTolerance}
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={110}
                    value={bgTolerance}
                    onChange={(e) => setBgTolerance(parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Edge Feathering: {bgFeather}px
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={bgFeather}
                    onChange={(e) => setBgFeather(parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">New Backdrop</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { val: 'transparent', label: 'Transparent' },
                      { val: '#FFFFFF', label: 'White' },
                      { val: '#FFF4F8', label: 'Soft Pink' },
                      { val: '#E0F2FE', label: 'Sky Blue' },
                    ].map((bg) => (
                      <button
                        key={bg.val}
                        type="button"
                        onClick={() => {
                          setBgFill(bg.val);
                          if (bg.val === 'transparent' && bgFormat === 'jpeg') {
                            setBgFormat('png');
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                          bgFill === bg.val
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={bgFill === 'transparent' ? '#ffffff' : bgFill}
                      onChange={(e) => setBgFill(e.target.value)}
                      title="Custom solid backdrop color"
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Output Format</label>
                  <div className={`grid gap-2 ${bgFill !== 'transparent' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {(bgFill !== 'transparent' ? (['png', 'webp', 'jpeg'] as const) : (['png', 'webp'] as const)).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setBgFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          bgFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : `${fmt} (Alpha)`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Enhance Photo Settings (Pure Algorithmic Auto-Levels & Unsharp Mask) */}
            {toolId === 'enhance-photo' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Enhancement Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'auto' as const, label: 'Auto HD', sh: 62, ct: 70, br: 4, vb: 40, dn: 12 },
                      { id: 'document' as const, label: 'Crisp Document Scan', sh: 80, ct: 88, br: 6, vb: 12, dn: 8 },
                      { id: 'portrait' as const, label: 'Smooth Portrait', sh: 40, ct: 50, br: 6, vb: 32, dn: 34 },
                      { id: 'vivid' as const, label: 'Vivid Color Boost', sh: 60, ct: 72, br: 4, vb: 70, dn: 10 },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setEnhancePreset(p.id);
                          setEnhanceSharpen(p.sh);
                          setEnhanceContrast(p.ct);
                          setEnhanceBrightness(p.br);
                          setEnhanceVibrance(p.vb);
                          setEnhanceDenoise(p.dn);
                        }}
                        className={`p-2 rounded-xl border font-bold cursor-pointer ${
                          enhancePreset === p.id
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Unsharp Mask Sharpen: {enhanceSharpen}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={enhanceSharpen}
                      onChange={(e) => {
                        setEnhancePreset('custom');
                        setEnhanceSharpen(parseInt(e.target.value, 10));
                      }}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Auto-Levels &amp; Clarity: {enhanceContrast}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={enhanceContrast}
                      onChange={(e) => {
                        setEnhancePreset('custom');
                        setEnhanceContrast(parseInt(e.target.value, 10));
                      }}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Vibrance: {enhanceVibrance}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={enhanceVibrance}
                      onChange={(e) => {
                        setEnhancePreset('custom');
                        setEnhanceVibrance(parseInt(e.target.value, 10));
                      }}
                      className="w-full accent-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Noise Reduction (Denoise): {enhanceDenoise}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={enhanceDenoise}
                      onChange={(e) => {
                        setEnhancePreset('custom');
                        setEnhanceDenoise(parseInt(e.target.value, 10));
                      }}
                      className="w-full accent-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setEnhanceFormat(fmt)}
                        className={`p-2 rounded-xl border font-bold uppercase cursor-pointer ${
                          enhanceFormat === fmt
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {fmt === 'jpeg' ? 'JPG' : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rename PDF & Photos Settings */}
            {toolId === 'rename-files' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    New Base Name (Optional — keeps original if empty)
                  </label>
                  <input
                    type="text"
                    value={renameBaseName}
                    onChange={(e) => setRenameBaseName(e.target.value)}
                    placeholder="e.g. Omini_Invoice"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E83E8C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={renamePrefix}
                      onChange={(e) => setRenamePrefix(e.target.value)}
                      placeholder="e.g. 2026_"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Suffix</label>
                    <input
                      type="text"
                      value={renameSuffix}
                      onChange={(e) => setRenameSuffix(e.target.value)}
                      placeholder="e.g. _final"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Find Text</label>
                    <input
                      type="text"
                      value={renameFind}
                      onChange={(e) => setRenameFind(e.target.value)}
                      placeholder="e.g. raw "
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Replace With</label>
                    <input
                      type="text"
                      value={renameReplace}
                      onChange={(e) => setRenameReplace(e.target.value)}
                      placeholder="e.g. clean_"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Numbering</label>
                    <select
                      value={renameNumbering}
                      onChange={(e) => setRenameNumbering(e.target.value as 'none' | 'suffix' | 'prefix')}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="suffix">Suffix (_1, _2)</option>
                      <option value="prefix">Prefix (1_, 2_)</option>
                      <option value="none">No Numbering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start At</label>
                    <input
                      type="number"
                      min={1}
                      value={renameStartNum}
                      onChange={(e) => setRenameStartNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Filename Casing</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'keep' as const, label: 'Keep' },
                      { id: 'lower' as const, label: 'lowercase' },
                      { id: 'slug' as const, label: 'clean_slug' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setRenameCasing(c.id)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                          renameCasing === c.id
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FFF4F8] border border-[#FFE3EE] space-y-1">
                    <span className="text-[11px] font-bold text-[#C92B72] uppercase">
                      Live Filename Preview
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto text-[11px]">
                      {buildBatchRenamePlan(
                        files.map((f) => f.name),
                        {
                          baseName: renameBaseName,
                          prefix: renamePrefix,
                          suffix: renameSuffix,
                          numbering: renameNumbering,
                          startNumber: renameStartNum,
                          findText: renameFind,
                          replaceText: renameReplace,
                          casing: renameCasing,
                        }
                      )
                        .slice(0, 6)
                        .map((nextName, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 truncate">
                            <span className="text-[#77717B] truncate max-w-[40%]">{files[idx].name}</span>
                            <span className="text-[#E83E8C] font-bold">→</span>
                            <span className="font-bold text-[#24212A] truncate">{nextName}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
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
            <div className="bg-[#FFF4F8] border-2 border-[#FFE3EE] rounded-3xl p-6 text-center animate-in zoom-in-95 duration-200 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-[#FFE3EE] text-[#1FA971] mx-auto flex items-center justify-center mb-3 shadow-xs">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-black text-[#24212A]">Processing Completed!</h4>
              <p className="text-xs text-[#77717B] mt-1">{result.summary}</p>

              {/* Action Buttons: Live Preview & Download */}
              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewTarget({
                      file: result.blob,
                      name: result.fileName,
                      downloadUrl: result.downloadUrl,
                      extraFiles: result.extraFiles,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 w-full min-w-0 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#24212A] bg-white border-2 border-[#E83E8C] hover:bg-[#FFE3EE] shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#E83E8C] shrink-0" />
                  <span className="truncate">
                    {isPhotoOnlyTool || toolId === 'rename-files'
                      ? 'Live Preview Updated File'
                      : 'Live Preview Updated PDF'}
                  </span>
                </button>

                <MonetagDownloadLink
                  downloadUrl={result.downloadUrl}
                  fileName={result.fileName}
                  className="inline-flex items-center justify-center gap-2 w-full min-w-0 overflow-hidden py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1FA971] hover:bg-[#168a5c] shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  title={`Watch Ad & Download ${result.fileName} (Ad opens in a new tab)`}
                >
                  {({ downloading, completed }) => (
                    <>
                      <Download className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {downloading
                          ? 'Opening Ad & Downloading...'
                          : completed
                          ? `Downloaded! (${result.fileName})`
                          : `Watch Ad & Download ${result.fileName}`}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-85" />
                    </>
                  )}
                </MonetagDownloadLink>
              </div>

              <p className="mt-2.5 text-[11px] font-medium text-[#77717B] bg-white/80 border border-[#FFE3EE] rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5 max-w-full">
                <ExternalLink className="w-3 h-3 text-[#E83E8C] shrink-0" />
                <span>
                  <strong className="text-[#24212A]">Watch Ad &amp; Download:</strong> Clicking Download opens a sponsor ad in a new tab &amp; downloads your file automatically.
                </span>
              </p>

              {onOpenHistory && (
                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="text-xs font-semibold text-[#C92B72] hover:text-[#E83E8C] hover:underline cursor-pointer"
                  >
                    Saved to History • View All Operations →
                  </button>
                  <p className="text-[11px] text-[#77717B]">
                    {user ? (
                      <>
                        Saved to your <strong className="text-[#24212A]">Account History</strong> ({user.email}).
                      </>
                    ) : (
                      <>
                        Saved in <strong className="text-[#24212A]">Browser Local Storage</strong>.{' '}
                        <button
                          type="button"
                          onClick={() => onRequireAuth('Optional: Sign in to save your PDF history to your Account.')}
                          className="text-[#E83E8C] font-semibold hover:underline cursor-pointer"
                        >
                          Sign in (optional)
                        </button>{' '}
                        to save to your account.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Embedded Interactive Live Preview Container */}
              <div className="mt-5 border border-[#FFE3EE] rounded-2xl bg-white p-3 sm:p-4 shadow-xs text-left">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1FA971] animate-pulse shrink-0"></span>
                    <span className="font-extrabold text-xs text-[#24212A]">Live Updated Document</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFE3EE] text-[#C92B72] shrink-0">
                      Verify Updates
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowResultInlinePreview(!showResultInlinePreview)}
                      className="text-xs text-[#77717B] hover:text-[#24212A] font-semibold cursor-pointer"
                    >
                      {showResultInlinePreview ? 'Hide View' : 'Show View'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewTarget({
                          file: result.blob,
                          name: result.fileName,
                          downloadUrl: result.downloadUrl,
                          extraFiles: result.extraFiles,
                        })
                      }
                      className="text-xs font-bold text-[#E83E8C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Screen</span>
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {showResultInlinePreview && (
                  <div className="mt-3 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <PdfCanvasViewer
                      file={result.blob}
                      fileName={result.fileName}
                      downloadUrl={result.downloadUrl}
                      compact={true}
                      fitWidth={true}
                      showControls={true}
                      extraFiles={result.extraFiles}
                      onSelectExtraFile={(extra) =>
                        setPreviewTarget({
                          file: extra.blob || null,
                          fileUrl: extra.url,
                          name: extra.name,
                          downloadUrl: extra.url,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Multi-file list if split or pdf-to-image */}
              {result.extraFiles && result.extraFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#FFE3EE] text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#24212A] uppercase">
                      Individual Pages / Files ({result.extraFiles.length})
                    </span>
                    <MonetagDownloadLink
                      downloadUrl={result.downloadUrl}
                      fileName={result.fileName}
                      className="text-[11px] font-semibold text-[#E83E8C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FolderArchive className="w-3 h-3" />
                      <span>Watch Ad &amp; Download ZIP</span>
                    </MonetagDownloadLink>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {result.extraFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#FFE3EE] text-xs shadow-2xs"
                      >
                        <span className="truncate max-w-[160px] font-medium text-slate-700">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewTarget({
                                file: f.blob || null,
                                fileUrl: f.url,
                                name: f.name,
                                downloadUrl: f.url,
                              })
                            }
                            className="text-[11px] font-bold text-[#E83E8C] hover:bg-[#FFE3EE] px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                          <MonetagDownloadLink
                            downloadUrl={f.url}
                            fileName={f.name}
                            className="text-[11px] font-bold text-[#1FA971] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Watch Ad &amp; Save</span>
                          </MonetagDownloadLink>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* In-Article Google AdSense Unit */}
          <AdSenseBanner
            slotId="7477499834"
            user={user}
            layout="in-article"
          />
        </div>
      </div>

      {/* Full-Screen PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewTarget}
        file={previewTarget?.file || null}
        fileUrl={previewTarget?.fileUrl}
        fileName={previewTarget?.name}
        downloadUrl={previewTarget?.downloadUrl}
        extraFiles={previewTarget?.extraFiles}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
};
