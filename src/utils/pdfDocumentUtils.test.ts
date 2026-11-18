import test from 'node:test';
import assert from 'node:assert/strict';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  buildDocxBytes,
  buildSpreadsheetBytes,
  extractTableGridFromItems,
  groupPdfItemsIntoLines,
  isWinAnsiSafe,
  parseHtmlToDocBlocks,
  sanitizeWinAnsi,
} from './pdfDocumentUtils.js';

test('groupPdfItemsIntoLines orders rows top-to-bottom and marks large titles as headings', () => {
  const lines = groupPdfItemsIntoLines([
    { str: 'Quarterly Invoice', x: 50, y: 760, height: 22 },
    { str: 'Item', x: 50, y: 700, height: 11 },
    { str: 'Amount', x: 300, y: 700, height: 11 },
    { str: 'Cloud Hosting', x: 50, y: 680, height: 11 },
    { str: 'INR 4,500', x: 300, y: 680, height: 11 },
  ]);

  assert.equal(lines.length, 3);
  assert.equal(lines[0].text, 'Quarterly Invoice');
  assert.equal(lines[0].isHeading, true);
  assert.match(lines[1].text, /Item\s+Amount/);
  assert.match(lines[2].text, /Cloud Hosting\s+INR 4,500/);
  assert.equal(lines[2].isHeading, false);
});

test('extractTableGridFromItems clusters PDF items into clean spreadsheet columns and rows', () => {
  const grid = extractTableGridFromItems([
    { str: 'Product', x: 50, y: 700, height: 11 },
    { str: 'Qty', x: 220, y: 700, height: 11 },
    { str: 'Total', x: 360, y: 700, height: 11 },
    { str: 'Paper A4', x: 50, y: 680, height: 11 },
    { str: '5', x: 222, y: 680, height: 11 },
    { str: '1250', x: 362, y: 680, height: 11 },
  ]);

  assert.equal(grid.length, 2);
  assert.deepEqual(grid[0], ['Product', 'Qty', 'Total']);
  assert.deepEqual(grid[1], ['Paper A4', '5', '1250']);
});

test('buildDocxBytes emits valid DOCX archive readable back by mammoth', async () => {
  const docxBytes = await buildDocxBytes(
    [
      {
        pageNumber: 1,
        lines: [
          { text: 'Omini Audit Summary', isHeading: true },
          { text: 'All accounts reconciled cleanly in FY 2026.', isHeading: false },
        ],
      },
      {
        pageNumber: 2,
        lines: [{ text: 'Page two appendix details.', isHeading: false }],
      },
    ],
    { pageBreaks: true, title: 'Audit' }
  );

  // PK zip magic signature
  assert.equal(docxBytes[0], 0x50);
  assert.equal(docxBytes[1], 0x4b);

  const extracted = await mammoth.extractRawText({ buffer: Buffer.from(docxBytes) });
  assert.match(extracted.value, /Omini Audit Summary/);
  assert.match(extracted.value, /All accounts reconciled cleanly/);
  assert.match(extracted.value, /Page two appendix details/);
});

test('buildSpreadsheetBytes creates valid multi-sheet XLSX readable back by SheetJS and CSV text', () => {
  const xlsxBytes = buildSpreadsheetBytes(
    [
      {
        name: 'Page_1',
        rows: [
          ['Item', 'Price'],
          ['Notebook', '120'],
        ],
      },
      {
        name: 'Page_2',
        rows: [
          ['Summary', 'Total'],
          ['Grand Total', '120'],
        ],
      },
    ],
    'xlsx'
  );

  const wb = XLSX.read(xlsxBytes, { type: 'array' });
  assert.deepEqual(wb.SheetNames, ['Page_1', 'Page_2']);
  const rows1 = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Page_1'], { header: 1 });
  assert.deepEqual(rows1, [
    ['Item', 'Price'],
    ['Notebook', '120'],
  ]);

  const csvBytes = buildSpreadsheetBytes(
    [{ name: 'Data', rows: [['ColA', 'ColB'], ['10', '20']] }],
    'csv'
  );
  const csvText = new TextDecoder().decode(csvBytes);
  assert.match(csvText, /ColA,ColB/);
  assert.match(csvText, /10,20/);
});

test('parseHtmlToDocBlocks extracts headings, paragraphs, list items, and table rows', () => {
  const blocks = parseHtmlToDocBlocks(
    '<h1>Invoice Title</h1><p>Issued by Code Garage &amp; Co.</p><ul><li>Item One</li></ul><table><tr><th>Name</th><th>Fee</th></tr><tr><td>Audit</td><td>500</td></tr></table>'
  );
  assert.equal(blocks[0].kind, 'h1');
  assert.equal(blocks[0].text, 'Invoice Title');
  assert.equal(blocks[1].text, 'Issued by Code Garage & Co.');
  assert.equal(blocks[2].kind, 'li');
  assert.equal(blocks[2].text, '• Item One');
  assert.equal(blocks[3].kind, 'tr');
  assert.deepEqual(blocks[3].cells, ['Name', 'Fee']);
  assert.deepEqual(blocks[4].cells, ['Audit', '500']);
});

test('WinAnsi detection identifies Bengali/Hindi Unicode vs ASCII cleanly', () => {
  assert.equal(isWinAnsiSafe('Hello Omini PDF 123!'), true);
  assert.equal(isWinAnsiSafe('বাংলা টেক্সট এবং हिंदी'), false);
  assert.equal(sanitizeWinAnsi('Smart “Quotes” — Test'), 'Smart "Quotes" - Test');
});
