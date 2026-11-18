/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';
import * as XLSX from 'xlsx';

export interface PositionedPdfTextItem {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface GroupedTextLine {
  y: number;
  text: string;
  maxHeight: number;
  isHeading: boolean;
}

export interface DocBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'tr';
  text: string;
  cells?: string[];
}

/**
 * Replaces characters unsupported by PDF WinAnsi standard fonts with safe equivalents
 * or falls back cleanly when rendering pure WinAnsi layers.
 */
export function isWinAnsiSafe(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10 || code === 13 || code === 9) continue;
    if (code >= 0x20 && code <= 0x7e) continue;
    if (code >= 0xa0 && code <= 0xff) continue;
    return false;
  }
  return true;
}

export function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Groups raw PDF text items into top-to-bottom ordered lines with heading heuristics
 * for clean DOCX generation.
 */
export function groupPdfItemsIntoLines(
  items: PositionedPdfTextItem[],
  yTolerance = 4.5
): GroupedTextLine[] {
  const cleanItems = items.filter((it) => it.str && it.str.trim().length > 0);
  if (cleanItems.length === 0) return [];

  // Sort top-to-bottom (higher Y first in PDF coordinates), then left-to-right
  const sorted = [...cleanItems].sort((a, b) => {
    if (Math.abs(b.y - a.y) > yTolerance) return b.y - a.y;
    return a.x - b.x;
  });

  const rows: Array<{ y: number; items: PositionedPdfTextItem[] }> = [];
  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow.y - item.y) <= yTolerance) {
      lastRow.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  // Compute median font height across page to distinguish headings cleanly
  const heights = cleanItems
    .map((i) => i.height || 11)
    .filter((h) => h > 0)
    .sort((a, b) => a - b);
  const medianHeight = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 11;

  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let lineText = '';
    let prevEndX = -Infinity;
    let maxH = 0;

    for (const part of row.items) {
      const h = part.height || 11;
      if (h > maxH) maxH = h;
      const chunk = part.str;
      if (prevEndX > -Infinity && part.x - prevEndX > 2.5 && !lineText.endsWith(' ') && !chunk.startsWith(' ')) {
        lineText += ' ';
      }
      lineText += chunk;
      prevEndX = part.x + (part.width || chunk.length * (h * 0.5));
    }

    const trimmed = lineText.trim();
    const isHeading = maxH >= medianHeight * 1.28 && trimmed.length <= 120;
    return {
      y: row.y,
      text: trimmed,
      maxHeight: maxH || medianHeight,
      isHeading,
    };
  }).filter((line) => line.text.length > 0);
}

/**
 * Extracts structured spreadsheet rows & columns by clustering PDF text items by Y-rows
 * and X-column anchors. Handles tables, invoices, statements, and delimited text.
 */
export function extractTableGridFromItems(
  items: PositionedPdfTextItem[],
  yTolerance = 4.5,
  colClusterGap = 18
): string[][] {
  const cleanItems = items.filter((it) => it.str && it.str.trim().length > 0);
  if (cleanItems.length === 0) return [];

  // Cluster items into rows top-to-bottom
  const sortedByY = [...cleanItems].sort((a, b) => b.y - a.y);
  const rawRows: Array<{ y: number; items: PositionedPdfTextItem[] }> = [];
  for (const item of sortedByY) {
    const match = rawRows.find((r) => Math.abs(r.y - item.y) <= yTolerance);
    if (match) {
      match.items.push(item);
    } else {
      rawRows.push({ y: item.y, items: [item] });
    }
  }
  rawRows.sort((a, b) => b.y - a.y);

  // Merge adjacent fragments on the same row that are part of the same cell
  const mergedRows = rawRows.map((row) => {
    const rowItems = [...row.items].sort((a, b) => a.x - b.x);
    const cells: Array<{ x: number; text: string }> = [];
    for (const it of rowItems) {
      const text = it.str.trim();
      if (!text) continue;
      const prev = cells[cells.length - 1];
      const approxGap = prev ? it.x - (prev.x + prev.text.length * ((it.height || 10) * 0.48)) : Infinity;
      if (prev && approxGap < colClusterGap) {
        prev.text = `${prev.text} ${text}`.trim();
      } else {
        cells.push({ x: it.x, text });
      }
    }
    return cells;
  }).filter((r) => r.length > 0);

  if (mergedRows.length === 0) return [];

  // Discover global column X-anchors across the page
  const allXs = mergedRows.flatMap((r) => r.map((c) => c.x)).sort((a, b) => a - b);
  const colAnchors: number[] = [];
  for (const x of allXs) {
    const existing = colAnchors.find((ax) => Math.abs(ax - x) <= colClusterGap);
    if (existing === undefined) {
      colAnchors.push(x);
    }
  }
  colAnchors.sort((a, b) => a - b);

  // Map every row's cells onto the nearest discovered column index
  const grid: string[][] = mergedRows.map((rowCells) => {
    const out = new Array<string>(colAnchors.length).fill('');
    for (const cell of rowCells) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < colAnchors.length; i++) {
        const d = Math.abs(cell.x - colAnchors[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      out[bestIdx] = out[bestIdx] ? `${out[bestIdx]} ${cell.text}` : cell.text;
    }
    return out;
  });

  // Drop columns that are completely empty
  const activeCols = colAnchors
    .map((_, idx) => idx)
    .filter((idx) => grid.some((row) => row[idx].trim().length > 0));

  return grid.map((row) => activeCols.map((idx) => row[idx].trim()));
}

/**
 * Generates a genuine OOXML Word (.docx) binary buffer from extracted PDF pages/lines.
 */
export async function buildDocxBytes(
  pages: Array<{ pageNumber: number; lines: Array<{ text: string; isHeading?: boolean }> }>,
  options: { pageBreaks?: boolean; title?: string } = {}
): Promise<Uint8Array> {
  const { pageBreaks = true, title = 'Converted Document' } = options;
  const children: Paragraph[] = [];

  pages.forEach((page, pIdx) => {
    if (pIdx > 0 && pageBreaks) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (page.lines.length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `[Page ${page.pageNumber} — no selectable text found]`, italics: true, color: '77717B' })],
        })
      );
      return;
    }

    page.lines.forEach((line, lIdx) => {
      if (!line.text.trim()) return;
      if (line.isHeading) {
        children.push(
          new Paragraph({
            heading: lIdx === 0 && pIdx === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({
                text: line.text,
                bold: true,
                size: lIdx === 0 && pIdx === 0 ? 32 : 26,
                font: 'Calibri',
              }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 110, line: 276 },
            children: [
              new TextRun({
                text: line.text,
                size: 22,
                font: 'Calibri',
              }),
            ],
          })
        );
      }
    });
  });

  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Document converted via Omini PDF.', size: 22 })],
      })
    );
  }

  const doc = new Document({
    title,
    creator: 'Omini PDF',
    sections: [{ properties: {}, children }],
  });

  const ab = await Packer.toArrayBuffer(doc);
  return new Uint8Array(ab);
}

/**
 * Generates an Excel (.xlsx) workbook or .csv byte array using SheetJS.
 */
export function buildSpreadsheetBytes(
  sheets: Array<{ name: string; rows: string[][] }>,
  format: 'xlsx' | 'csv' = 'xlsx'
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const safeSheets =
    sheets.length > 0 && sheets.some((s) => s.rows.length > 0)
      ? sheets
      : [{ name: 'Extracted_Data', rows: [['Note'], ['No structured text rows detected in this PDF. Try OCR PDF for scanned documents.']] }];

  if (format === 'csv') {
    const combinedRows = safeSheets.flatMap((s, idx) =>
      idx === 0 ? s.rows : [[`--- ${s.name} ---`], ...s.rows]
    );
    const ws = XLSX.utils.aoa_to_sheet(combinedRows);
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    return new TextEncoder().encode(csvStr);
  }

  safeSheets.forEach((sheet, idx) => {
    const safeName = (sheet.name || `Page_${idx + 1}`).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || `Sheet_${idx + 1}`;
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows.length > 0 ? sheet.rows : [['']]);
    // Set reasonable column widths based on cell content
    const maxCols = sheet.rows.reduce((acc, r) => Math.max(acc, r.length), 1);
    ws['!cols'] = Array.from({ length: maxCols }, (_, colIdx) => {
      const longest = sheet.rows.reduce((mx, r) => Math.max(mx, (r[colIdx] || '').length), 10);
      return { wch: Math.min(48, Math.max(12, longest + 3)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses HTML (e.g. from mammoth.convertToHtml) into structured visual blocks
 * suitable for crisp multi-page Word-to-PDF rendering.
 */
export function parseHtmlToDocBlocks(html: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const tokenRegex = /<(h1|h2|h3|h4|li|p|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === 'tr') {
      const cells: string[] = [];
      const cellRegex = /<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(inner)) !== null) {
        cells.push(decodeHtmlEntities(cellMatch[2]));
      }
      if (cells.some((c) => c.length > 0)) {
        blocks.push({ kind: 'tr', text: cells.join(' | '), cells });
      }
      continue;
    }

    const text = decodeHtmlEntities(inner);
    if (!text) continue;

    if (tag === 'h1') blocks.push({ kind: 'h1', text });
    else if (tag === 'h2') blocks.push({ kind: 'h2', text });
    else if (tag === 'h3' || tag === 'h4') blocks.push({ kind: 'h3', text });
    else if (tag === 'li') blocks.push({ kind: 'li', text: `• ${text}` });
    else blocks.push({ kind: 'p', text });
  }

  if (blocks.length === 0) {
    const plain = decodeHtmlEntities(html);
    if (plain) {
      plain.split(/\n+/).forEach((line) => {
        const clean = line.trim();
        if (clean) blocks.push({ kind: 'p', text: clean });
      });
    }
  }

  return blocks;
}
