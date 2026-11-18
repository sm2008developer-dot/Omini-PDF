/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { createWorker, OEM } from 'tesseract.js';
import type { ProcessedPdfResult } from './pdfEngine.js';
import { loadImageElement } from './imageEngine.js';
import { parsePageRanges } from './pdfLimits.js';
import {
  buildDocxBytes,
  buildSpreadsheetBytes,
  extractTableGridFromItems,
  groupPdfItemsIntoLines,
  isWinAnsiSafe,
  parseHtmlToDocBlocks,
  PositionedPdfTextItem,
  sanitizeWinAnsi,
} from './pdfDocumentUtils.js';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

function parseHexColorRgb(hex: string) {
  const clean = (hex || '#111827').replace('#', '');
  if (clean.length !== 6) return rgb(0.1, 0.1, 0.15);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0.1 : r, isNaN(g) ? 0.1 : g, isNaN(b) ? 0.15 : b);
}

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function renderUnicodeLineToPngBytes(
  text: string,
  fontSize: number,
  colorHex: string,
  bold = false
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const scale = 3;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSpec = `${bold ? 'bold ' : ''}${Math.round(fontSize * scale)}px "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif`;
  ctx.font = fontSpec;
  const metrics = ctx.measureText(text);
  const w = Math.max(24, Math.ceil(metrics.width + 12 * scale));
  const h = Math.max(24, Math.ceil(fontSize * 1.45 * scale));
  canvas.width = w;
  canvas.height = h;
  const c2 = canvas.getContext('2d')!;
  c2.font = fontSpec;
  c2.fillStyle = colorHex || '#111827';
  c2.textBaseline = 'middle';
  c2.fillText(text, 4 * scale, h / 2);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
  );
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: w / scale,
    height: h / scale,
  };
}

/**
 * 1. PDF TO WORD (.docx): Extracts text structure page-by-page into an editable DOCX file
 */
export async function pdfToWordDocx(
  file: File,
  options: { pageBreaks?: boolean } = {}
): Promise<ProcessedPdfResult> {
  const { pageBreaks = true } = options;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pagesData: Array<{
    pageNumber: number;
    lines: Array<{ text: string; isHeading: boolean }>;
  }> = [];
  let plainPreview = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: PositionedPdfTextItem[] = [];

    for (const raw of content.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const it = raw as any;
      if (typeof it.str === 'string' && it.str.trim()) {
        items.push({
          str: it.str,
          x: it.transform?.[4] ?? 0,
          y: it.transform?.[5] ?? 0,
          width: it.width ?? 0,
          height: Math.abs(it.height || it.transform?.[0] || 11),
        });
      }
    }

    const lines = groupPdfItemsIntoLines(items);
    pagesData.push({ pageNumber: i, lines });
    if (lines.length > 0) {
      plainPreview += `--- Page ${i} ---\n${lines.map((l) => l.text).join('\n')}\n\n`;
    }
  }

  await pdf.cleanup().catch(() => {});

  const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
  const docxBytes = await buildDocxBytes(pagesData, { pageBreaks, title: baseName });
  const blob = new Blob([docxBytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `${baseName}.docx`,
    fileSize: blob.size,
    pageCount: pdf.numPages,
    extractedText: plainPreview.trim() || undefined,
    summary: `Converted ${pdf.numPages} PDF page(s) into an editable Word (.docx) document.`,
  };
}

/**
 * 2. WORD TO PDF (.docx / .doc -> .pdf): Parses Word formatting via mammoth & renders crisp A4/Letter pages
 */
export async function wordToPdfFile(
  file: File,
  options: { pageSize?: 'a4' | 'letter'; fontSize?: number } = {}
): Promise<ProcessedPdfResult> {
  const { pageSize = 'a4', fontSize = 11 } = options;
  const arrayBuffer = await file.arrayBuffer();
  const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml');

  let html = '';
  if (isDocx) {
    try {
      const res = await mammoth.convertToHtml({ arrayBuffer });
      html = res.value || '';
    } catch {
      html = '';
    }
  }

  if (!html.trim()) {
    // Fallback for plain text or legacy .doc files: extract printable runs
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(arrayBuffer));
    const readable = raw
      .replace(/[^\x20-\x7E\n\r\t\u0980-\u09FF\u0900-\u097F]/g, ' ')
      .replace(/ {3,}/g, '\n')
      .trim();
    html = readable
      .split(/\n+/)
      .filter((l) => l.trim().length > 2)
      .slice(0, 300)
      .map((l) => `<p>${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
      .join('');
  }

  const blocks = parseHtmlToDocBlocks(html);
  if (blocks.length === 0) {
    blocks.push({ kind: 'p', text: `Converted from ${file.name} via Omini PDF.` });
  }

  const pageW = pageSize === 'letter' ? 612 : 595.28;
  const pageH = pageSize === 'letter' ? 792 : 841.89;
  const margin = 48;
  const maxContentW = pageW - margin * 2;

  const hasNonWinAnsi = blocks.some((b) => !isWinAnsiSafe(b.text));
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(file.name.replace(/\.(docx?|rtf|txt)$/i, ''));
  pdfDoc.setCreator('Omini PDF Word-to-PDF Converter');

  if (hasNonWinAnsi) {
    // Render crisp multi-page canvas sheets so Bengali / Hindi / Unicode scripts look 100% sharp
    const scale = 2;
    const cw = Math.round(pageW * scale);
    const ch = Math.round(pageH * scale);
    const marginPx = margin * scale;
    const contentPxW = maxContentW * scale;

    const canvases: HTMLCanvasElement[] = [];
    let canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    let ctx = canvas.getContext('2d')!;
    const initCanvas = (c: HTMLCanvasElement, c2: CanvasRenderingContext2D) => {
      c2.fillStyle = '#FFFFFF';
      c2.fillRect(0, 0, c.width, c.height);
    };
    initCanvas(canvas, ctx);
    canvases.push(canvas);
    let cursorY = marginPx + 18 * scale;

    const nextPage = () => {
      canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      ctx = canvas.getContext('2d')!;
      initCanvas(canvas, ctx);
      canvases.push(canvas);
      cursorY = marginPx + 18 * scale;
    };

    for (const block of blocks) {
      const sz =
        block.kind === 'h1'
          ? (fontSize + 7) * scale
          : block.kind === 'h2'
          ? (fontSize + 4) * scale
          : block.kind === 'h3'
          ? (fontSize + 2) * scale
          : fontSize * scale;
      const isBold = block.kind === 'h1' || block.kind === 'h2' || block.kind === 'h3';
      ctx.font = `${isBold ? 'bold ' : ''}${Math.round(sz)}px "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif`;
      ctx.fillStyle = block.kind === 'h1' ? '#C92B72' : '#1E293B';

      const words = block.text.split(/\s+/);
      let line = '';
      const lineHeight = sz * 1.48;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > contentPxW && line) {
          if (cursorY + lineHeight > ch - marginPx) nextPage();
          ctx.fillText(line, block.kind === 'li' ? marginPx + 14 * scale : marginPx, cursorY);
          cursorY += lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        if (cursorY + lineHeight > ch - marginPx) nextPage();
        ctx.fillText(line, block.kind === 'li' ? marginPx + 14 * scale : marginPx, cursorY);
        cursorY += lineHeight;
      }
      cursorY += (isBold ? 8 : 5) * scale;
    }

    for (const pageCanvas of canvases) {
      const pngBlob = await new Promise<Blob>((r) =>
        pageCanvas.toBlob((b) => r(b || new Blob()), 'image/png')
      );
      const pngImg = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
      const pdfPage = pdfDoc.addPage([pageW, pageH]);
      pdfPage.drawImage(pngImg, { x: 0, y: 0, width: pageW, height: pageH });
    }
  } else {
    // Pure vector text rendering via pdf-lib StandardFonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([pageW, pageH]);
    let cursorY = pageH - margin;

    const ensureSpace = (needed: number) => {
      if (cursorY - needed < margin) {
        page = pdfDoc.addPage([pageW, pageH]);
        cursorY = pageH - margin;
      }
    };

    for (const block of blocks) {
      if (block.kind === 'tr' && block.cells && block.cells.length > 0) {
        const rowH = fontSize * 1.6 + 6;
        ensureSpace(rowH);
        const colW = maxContentW / block.cells.length;
        block.cells.forEach((cellText, idx) => {
          const x = margin + idx * colW;
          page.drawRectangle({
            x,
            y: cursorY - rowH + 4,
            width: colW,
            height: rowH,
            borderColor: rgb(0.85, 0.87, 0.9),
            borderWidth: 0.7,
          });
          const truncated = cellText.length > 34 ? `${cellText.slice(0, 32)}..` : cellText;
          page.drawText(truncated, {
            x: x + 6,
            y: cursorY - fontSize - 2,
            size: Math.max(9, fontSize - 1),
            font: regularFont,
            color: rgb(0.14, 0.13, 0.16),
          });
        });
        cursorY -= rowH;
        continue;
      }

      const sz =
        block.kind === 'h1'
          ? fontSize + 7
          : block.kind === 'h2'
          ? fontSize + 4
          : block.kind === 'h3'
          ? fontSize + 2
          : fontSize;
      const isBold = block.kind === 'h1' || block.kind === 'h2' || block.kind === 'h3';
      const activeFont = isBold ? boldFont : regularFont;
      const indent = block.kind === 'li' ? 14 : 0;
      const lineGap = sz * 1.45;
      const textColor = block.kind === 'h1' ? rgb(0.79, 0.17, 0.45) : rgb(0.14, 0.13, 0.16);

      const words = block.text.split(/\s+/);
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (activeFont.widthOfTextAtSize(candidate, sz) > maxContentW - indent && line) {
          ensureSpace(lineGap);
          page.drawText(line, { x: margin + indent, y: cursorY - sz, size: sz, font: activeFont, color: textColor });
          cursorY -= lineGap;
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) {
        ensureSpace(lineGap);
        page.drawText(line, { x: margin + indent, y: cursorY - sz, size: sz, font: activeFont, color: textColor });
        cursorY -= lineGap;
      }
      cursorY -= isBold ? 8 : 5;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.(docx?|rtf|txt)$/i, '') || 'converted';
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `${baseName}.pdf`,
    fileSize: blob.size,
    pageCount: pdfDoc.getPageCount(),
    summary: `Converted ${file.name} into a ${pdfDoc.getPageCount()}-page ${pageSize.toUpperCase()} PDF.`,
  };
}

/**
 * 3. PDF TO EXCEL (.xlsx / .csv): Clusters PDF X/Y positions into tabular spreadsheets
 */
export async function pdfToExcelFile(
  file: File,
  options: { format?: 'xlsx' | 'csv'; splitSheets?: boolean } = {}
): Promise<ProcessedPdfResult> {
  const { format = 'xlsx', splitSheets = true } = options;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const sheets: Array<{ name: string; rows: string[][] }> = [];
  let totalRows = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: PositionedPdfTextItem[] = [];

    for (const raw of content.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const it = raw as any;
      if (typeof it.str === 'string' && it.str.trim()) {
        items.push({
          str: it.str,
          x: it.transform?.[4] ?? 0,
          y: it.transform?.[5] ?? 0,
          width: it.width ?? 0,
          height: Math.abs(it.height || it.transform?.[0] || 11),
        });
      }
    }

    const rows = extractTableGridFromItems(items);
    totalRows += rows.length;
    if (rows.length > 0) {
      sheets.push({ name: `Page_${i}`, rows });
    }
  }

  await pdf.cleanup().catch(() => {});

  const finalSheets =
    splitSheets || sheets.length <= 1
      ? sheets
      : [{ name: 'All_Pages', rows: sheets.flatMap((s) => s.rows) }];

  const outBytes = buildSpreadsheetBytes(finalSheets, format);
  const mime =
    format === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const baseName = file.name.replace(/\.pdf$/i, '') || 'table_export';
  const blob = new Blob([outBytes as unknown as BlobPart], { type: mime });
  const downloadUrl = URL.createObjectURL(blob);

  return {
    blob,
    downloadUrl,
    fileName: `${baseName}.${format}`,
    fileSize: blob.size,
    pageCount: finalSheets.length || 1,
    summary: `Extracted ${totalRows} row(s) across ${pdf.numPages} page(s) into ${format.toUpperCase()}.`,
  };
}

/**
 * 4. UNLOCK PDF: Removes password encryption & copy/print restrictions into a clean standard PDF
 */
export async function unlockPdfFile(
  file: File,
  password = ''
): Promise<ProcessedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
  const trimmedPw = password;

  // Attempt 1: Clean structural decryption via @cantoo/pdf-lib (keeps sharp vectors!)
  try {
    const { PDFDocument: DecryptPDF } = await import('@cantoo/pdf-lib');
    const srcDoc = await DecryptPDF.load(arrayBuffer, {
      password: trimmedPw || undefined,
    });

    const cleanDoc = await DecryptPDF.create();
    const copiedPages = await cleanDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((p) => cleanDoc.addPage(p));
    cleanDoc.setProducer('Omini PDF Unlocker');

    const cleanBytes = await cleanDoc.save();
    // Verify via pdfjs without password that output is truly unlocked
    const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(cleanBytes) }).promise;
    const pageCount = verifyDoc.numPages;
    await verifyDoc.cleanup().catch(() => {});

    const blob = new Blob([cleanBytes as unknown as BlobPart], { type: 'application/pdf' });
    return {
      blob,
      downloadUrl: URL.createObjectURL(blob),
      fileName: `unlocked_${baseName}.pdf`,
      fileSize: blob.size,
      pageCount,
      summary: `Removed password & restrictions from ${file.name} (${pageCount} page(s)).`,
    };
  } catch {
    // Fall through to pdfjs-dist high-res decrypt-and-rebuild fallback
  }

  // Attempt 2: Decrypt with pdfjs-dist (supports wider RC4/AES variants) & rebuild crisp unlocked pages
  try {
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      password: trimmedPw || undefined,
    }).promise;

    const outDoc = await PDFDocument.create();
    outDoc.setProducer('Omini PDF Unlocker');

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const baseVp = page.getViewport({ scale: 1 });
      const renderVp = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(renderVp.width));
      canvas.height = Math.max(1, Math.round(renderVp.height));
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page as any).render({ canvas, viewport: renderVp, background: '#FFFFFF' }).promise;

      const jpgBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.94)
      );
      const jpgImg = await outDoc.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
      const outPage = outDoc.addPage([baseVp.width, baseVp.height]);
      outPage.drawImage(jpgImg, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
    }

    const total = pdf.numPages;
    await pdf.cleanup().catch(() => {});

    const cleanBytes = await outDoc.save();
    const blob = new Blob([cleanBytes as unknown as BlobPart], { type: 'application/pdf' });
    return {
      blob,
      downloadUrl: URL.createObjectURL(blob),
      fileName: `unlocked_${baseName}.pdf`,
      fileSize: blob.size,
      pageCount: total,
      summary: `Unlocked ${file.name} cleanly into an unrestricted ${total}-page PDF.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    const errName = err instanceof Error ? err.name : '';
    if (errName === 'PasswordException' || msg.includes('password') || msg.includes('decrypt')) {
      throw new Error(
        trimmedPw
          ? 'Incorrect PDF password. Please double-check and try again.'
          : 'This PDF is locked with a password. Enter the PDF password above to unlock it.'
      );
    }
    throw new Error('Could not unlock this PDF. Please verify the file and password.');
  }
}

/**
 * 5. FULL EDIT PDF: Supports Text Boxes, Whiteout/Eraser, Highlights, Shapes, and Freehand Drawings
 */
export interface FullPdfEditItem {
  id: string;
  pageIndex: number;
  kind: 'text' | 'whiteout' | 'highlight' | 'rect' | 'draw';
  x?: number; // normalized 0..1
  y?: number; // normalized 0..1 from top
  w?: number; // normalized 0..1
  h?: number; // normalized 0..1
  text?: string;
  fontSize?: number;
  color?: string;
  fillBg?: boolean;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
}

export async function editPdfFullFile(
  file: File,
  edits: FullPdfEditItem[]
): Promise<ProcessedPdfResult> {
  if (!edits || edits.length === 0) {
    throw new Error('Please add at least one text box, whiteout, shape, or drawing onto the PDF first.');
  }

  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  let applied = 0;

  for (const edit of edits) {
    const page = pages[edit.pageIndex];
    if (!page) continue;
    const { width, height } = page.getSize();
    const colorRgb = parseHexColorRgb(edit.color || '#111827');

    if (edit.kind === 'whiteout') {
      const bw = Math.max(8, (edit.w ?? 0.2) * width);
      const bh = Math.max(8, (edit.h ?? 0.05) * height);
      const bx = (edit.x ?? 0.1) * width;
      const by = height - ((edit.y ?? 0.1) * height + bh);
      page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: rgb(1, 1, 1) });
      applied++;
    } else if (edit.kind === 'highlight') {
      const bw = Math.max(8, (edit.w ?? 0.3) * width);
      const bh = Math.max(8, (edit.h ?? 0.04) * height);
      const bx = (edit.x ?? 0.1) * width;
      const by = height - ((edit.y ?? 0.1) * height + bh);
      page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: colorRgb, opacity: 0.36 });
      applied++;
    } else if (edit.kind === 'rect') {
      const bw = Math.max(8, (edit.w ?? 0.25) * width);
      const bh = Math.max(8, (edit.h ?? 0.12) * height);
      const bx = (edit.x ?? 0.1) * width;
      const by = height - ((edit.y ?? 0.1) * height + bh);
      page.drawRectangle({
        x: bx,
        y: by,
        width: bw,
        height: bh,
        borderColor: colorRgb,
        borderWidth: 2,
      });
      applied++;
    } else if (edit.kind === 'text' && edit.text?.trim()) {
      const txt = edit.text.trim();
      const sz = Math.max(8, Math.min(48, edit.fontSize || 14));
      const tx = Math.max(8, Math.min(width - 40, (edit.x ?? 0.1) * width));
      const ty = Math.max(16, Math.min(height - 16, height - (edit.y ?? 0.1) * height));

      if (isWinAnsiSafe(txt)) {
        const tw = font.widthOfTextAtSize(txt, sz);
        if (edit.fillBg) {
          page.drawRectangle({ x: tx - 4, y: ty - 4, width: tw + 8, height: sz + 8, color: rgb(1, 1, 1) });
        }
        page.drawText(txt, { x: tx, y: ty, size: sz, font, color: colorRgb });
      } else {
        // Unicode text fallback via crisp transparent PNG stamp
        const stamped = await renderUnicodeLineToPngBytes(txt, sz, edit.color || '#111827', true);
        const pngImg = await pdfDoc.embedPng(stamped.bytes);
        if (edit.fillBg) {
          page.drawRectangle({
            x: tx - 3,
            y: ty - 3,
            width: stamped.width + 6,
            height: stamped.height + 6,
            color: rgb(1, 1, 1),
          });
        }
        page.drawImage(pngImg, { x: tx, y: ty - stamped.height * 0.2, width: stamped.width, height: stamped.height });
      }
      applied++;
    } else if (edit.kind === 'draw' && edit.points && edit.points.length > 1) {
      const thick = Math.max(1, Math.min(10, edit.strokeWidth || 2.5));
      for (let i = 1; i < edit.points.length; i++) {
        const p0 = edit.points[i - 1];
        const p1 = edit.points[i];
        page.drawLine({
          start: { x: p0.x * width, y: height - p0.y * height },
          end: { x: p1.x * width, y: height - p1.y * height },
          thickness: thick,
          color: colorRgb,
        });
      }
      applied++;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return {
    blob,
    downloadUrl: URL.createObjectURL(blob),
    fileName: `edited_${file.name}`,
    fileSize: blob.size,
    pageCount: pages.length,
    summary: `Applied ${applied} edit(s) onto ${file.name}.`,
  };
}

/**
 * 6. SIGN PDF: Stamps handwritten/typed/uploaded signature PNG + optional signer date stamp
 */
export interface PdfSignaturePlacement {
  id: string;
  pageIndex: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1 from top
  w: number; // normalized 0..1
  h: number; // normalized 0..1
  signatureDataUrl: string;
  signerName?: string;
  includeDate?: boolean;
}

export async function signPdfFile(
  file: File,
  placements: PdfSignaturePlacement[]
): Promise<ProcessedPdfResult> {
  if (!placements || placements.length === 0) {
    throw new Error('Please create a signature and place it on the PDF page first.');
  }

  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  let stamped = 0;
  for (const pl of placements) {
    const page = pages[pl.pageIndex];
    if (!page || !pl.signatureDataUrl) continue;
    const { width, height } = page.getSize();

    const sigBytes = await dataUrlToUint8Array(pl.signatureDataUrl);
    const sigImg = await pdfDoc.embedPng(sigBytes);

    const boxW = Math.max(40, pl.w * width);
    const boxH = Math.max(20, pl.h * height);
    const boxX = pl.x * width;
    const boxY = height - (pl.y * height + boxH);

    // Maintain aspect ratio of signature inside placement box
    const ratio = Math.min(boxW / sigImg.width, boxH / sigImg.height);
    const drawW = sigImg.width * ratio;
    const drawH = sigImg.height * ratio;
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH) / 2;

    page.drawImage(sigImg, { x: drawX, y: drawY, width: drawW, height: drawH });

    const captionParts: string[] = [];
    if (pl.signerName?.trim()) captionParts.push(pl.signerName.trim());
    if (pl.includeDate) captionParts.push(new Date().toLocaleDateString());

    if (captionParts.length > 0) {
      const caption = sanitizeWinAnsi(captionParts.join(' • '));
      if (caption) {
        page.drawText(caption, {
          x: drawX,
          y: Math.max(8, drawY - 12),
          size: 9,
          font,
          color: rgb(0.3, 0.32, 0.38),
        });
      }
    }
    stamped++;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return {
    blob,
    downloadUrl: URL.createObjectURL(blob),
    fileName: `signed_${file.name}`,
    fileSize: blob.size,
    pageCount: pages.length,
    summary: `Stamped ${stamped} signature(s) onto ${file.name}.`,
  };
}

/**
 * 7. OCR PDF (Pure Client-Side Tesseract.js WASM — Zero AI):
 * Recognizes English / Bengali / Hindi text from scanned PDFs or photos -> Searchable PDF or TXT
 */
export async function ocrPdfOrImageFile(
  file: File,
  options: {
    language?: string;
    outputFormat?: 'pdf' | 'txt';
    pageRange?: string;
    onProgress?: (pct: number, status: string) => void;
  } = {}
): Promise<ProcessedPdfResult> {
  const { language = 'eng', outputFormat = 'pdf', pageRange = '', onProgress } = options;
  const isPdf = file.type.includes('pdf') || /\.pdf$/i.test(file.name);
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'ocr_document';

  onProgress?.(5, `Initializing Tesseract OCR (${language})...`);
  const worker = await createWorker(language, OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.min(95, Math.round(15 + m.progress * 75)), 'Recognizing characters...');
      }
    },
  });

  try {
    const outPdf = outputFormat === 'pdf' ? await PDFDocument.create() : null;
    const invisibleFont = outPdf ? await outPdf.embedFont(StandardFonts.Helvetica) : null;
    const extractedSections: string[] = [];
    let processedPages = 0;

    const processCanvasPage = async (canvas: HTMLCanvasElement, pageLabel: number, targetPdfW?: number, targetPdfH?: number) => {
      onProgress?.(Math.min(90, 20 + pageLabel * 10), `Running OCR on Page ${pageLabel}...`);
      const res = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const text = (res.data.text || '').trim();
      extractedSections.push(`--- Page ${pageLabel} ---\n${text || '[No text recognized]'}`);

      if (outPdf && invisibleFont) {
        const pdfW = targetPdfW || canvas.width * 0.75;
        const pdfH = targetPdfH || canvas.height * 0.75;
        const page = outPdf.addPage([pdfW, pdfH]);

        // Place original scanned image visually
        const jpgBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.92)
        );
        const imgEmbed = await outPdf.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
        page.drawImage(imgEmbed, { x: 0, y: 0, width: pdfW, height: pdfH });

        // Place invisible selectable text layer aligned to Tesseract line bounding boxes
        const sx = pdfW / Math.max(1, canvas.width);
        const sy = pdfH / Math.max(1, canvas.height);

        const blocks = res.data.blocks || [];
        let placedAnyLine = false;
        for (const blk of blocks) {
          for (const para of blk.paragraphs || []) {
            for (const line of para.lines || []) {
              const safeLine = sanitizeWinAnsi(line.text || '');
              if (!safeLine) continue;
              const box = line.bbox;
              const lineH = Math.max(8, (box.y1 - box.y0) * sy);
              const px = Math.max(4, box.x0 * sx);
              const py = Math.max(4, pdfH - box.y1 * sy);
              page.drawText(safeLine, {
                x: px,
                y: py,
                size: Math.min(36, Math.max(7, lineH * 0.85)),
                font: invisibleFont,
                color: rgb(0, 0, 0),
                opacity: 0.001,
              });
              placedAnyLine = true;
            }
          }
        }

        if (!placedAnyLine && text) {
          const safeAll = sanitizeWinAnsi(text).slice(0, 1200);
          if (safeAll) {
            page.drawText(safeAll, {
              x: 16,
              y: pdfH - 28,
              size: 9,
              font: invisibleFont,
              color: rgb(0, 0, 0),
              opacity: 0.001,
            });
          }
        }
      }
      processedPages++;
    };

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const targetPages =
        pageRange && pageRange.trim()
          ? parsePageRanges(pageRange, pdf.numPages)
          : Array.from({ length: pdf.numPages }, (_, idx) => idx + 1);
      const effectivePages = targetPages.length > 0 ? targetPages : [1];

      for (const pNum of effectivePages) {
        const page = await pdf.getPage(pNum);
        const baseVp = page.getViewport({ scale: 1 });
        const ocrVp = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(ocrVp.width));
        canvas.height = Math.max(1, Math.round(ocrVp.height));
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page as any).render({ canvas, viewport: ocrVp, background: '#FFFFFF' }).promise;
        await processCanvasPage(canvas, pNum, baseVp.width, baseVp.height);
      }

      await pdf.cleanup().catch(() => {});
    } else {
      const { img, width, height } = await loadImageElement(file);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      await processCanvasPage(canvas, 1, width * 0.75, height * 0.75);
    }

    const fullExtractedText = extractedSections.join('\n\n').trim();
    onProgress?.(100, 'OCR complete!');

    if (outputFormat === 'txt') {
      const txtBlob = new Blob([fullExtractedText], { type: 'text/plain;charset=utf-8' });
      return {
        blob: txtBlob,
        downloadUrl: URL.createObjectURL(txtBlob),
        fileName: `${baseName}_ocr.txt`,
        fileSize: txtBlob.size,
        pageCount: processedPages,
        extractedText: fullExtractedText,
        summary: `Recognized text across ${processedPages} page(s) using Tesseract (${language}) → exported TXT.`,
      };
    }

    const pdfBytes = await outPdf!.save();
    const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    return {
      blob: pdfBlob,
      downloadUrl: URL.createObjectURL(pdfBlob),
      fileName: `searchable_${baseName}.pdf`,
      fileSize: pdfBlob.size,
      pageCount: processedPages,
      extractedText: fullExtractedText,
      summary: `Created Searchable PDF with selectable OCR text layer (${processedPages} page(s), ${language}).`,
    };
  } finally {
    await worker.terminate().catch(() => {});
  }
}

/* ============================================================
 * Sample File Generators for Quick Testing
 * ============================================================ */

export async function generateSampleDocxFile(): Promise<File> {
  const bytes = await buildDocxBytes(
    [
      {
        pageNumber: 1,
        lines: [
          { text: 'Omini PDF Sample Word Document', isHeading: true },
          {
            text: 'Prepared for instant Word to PDF conversion directly inside your browser.',
            isHeading: false,
          },
          {
            text: '1. Project Deliverable: Client-side DOCX to A4/Letter PDF engine.',
            isHeading: false,
          },
          {
            text: '2. Privacy Notice: Files never leave your computer during conversion.',
            isHeading: false,
          },
        ],
      },
    ],
    { pageBreaks: false, title: 'Omini Sample DOCX' }
  );
  return new File(
    [new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })],
    'Sample_Proposal.docx',
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  );
}

export async function generateSampleEncryptedPdfFile(): Promise<File> {
  const { PDFDocument: EncryptDoc, StandardFonts: EncFonts, rgb: encRgb } = await import('@cantoo/pdf-lib');
  const doc = await EncryptDoc.create();
  const font = await doc.embedFont(EncFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(EncFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  page.drawText('Omini PDF Locked Sample (Password: 1234)', {
    x: 48,
    y: 770,
    size: 18,
    font,
    color: encRgb(0.85, 0.14, 0.45),
  });
  page.drawText(
    'Enter password "1234" in Tool Settings and click Process Unlock PDF to strip encryption.',
    { x: 48, y: 730, size: 12, font: bodyFont, color: encRgb(0.16, 0.16, 0.2) }
  );
  doc.encrypt({
    userPassword: '1234',
    ownerPassword: '1234_owner',
    algorithm: 'AES-256',
    permissions: { printing: 'highResolution', copying: false, modifying: false },
  });
  const bytes = await doc.save({ useObjectStreams: false });
  return new File([new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })], 'Locked_Sample_1234.pdf', {
    type: 'application/pdf',
  });
}

export async function generateSampleTablePdfFile(): Promise<File> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);

  page.drawText('Monthly Expense Statement - Q3 2026', {
    x: 48,
    y: 785,
    size: 16,
    font: bold,
    color: rgb(0.85, 0.14, 0.45),
  });

  const rows = [
    ['Item Description', 'Category', 'Qty', 'Amount (INR)'],
    ['Cloud Server Hosting', 'Infrastructure', '2', '4800'],
    ['Domain & SSL Renewal', 'Security', '1', '1250'],
    ['Design Software Seat', 'Design', '3', '3600'],
    ['Printer Paper A4 Ream', 'Office', '10', '2900'],
    ['Total Expense', 'Summary', '16', '12550'],
  ];

  const colXs = [48, 220, 350, 440];
  rows.forEach((row, rIdx) => {
    const y = 735 - rIdx * 24;
    row.forEach((cell, cIdx) => {
      page.drawText(cell, {
        x: colXs[cIdx],
        y,
        size: 11,
        font: rIdx === 0 || rIdx === rows.length - 1 ? bold : reg,
        color: rgb(0.14, 0.13, 0.16),
      });
    });
  });

  const bytes = await doc.save();
  return new File([new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })], 'Sample_Expense_Table.pdf', {
    type: 'application/pdf',
  });
}

export async function generateSampleScanOcrImageFile(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.fillText('OMINI PDF SCANNED INVOICE #2026-88', 64, 110);

  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('Client Name: Aarav Enterprises Pvt Ltd', 64, 185);
  ctx.fillText('Invoice Date: 18 November 2026', 64, 240);
  ctx.fillText('Net Payable Amount: INR 14,500', 64, 295);
  ctx.fillText('Status: Approved & Verified for Browser OCR', 64, 365);

  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b || new Blob()), 'image/png'));
  return new File([blob], 'Sample_Scanned_Invoice.png', { type: 'image/png' });
}
