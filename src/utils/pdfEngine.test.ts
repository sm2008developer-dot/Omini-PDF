import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import UPNG from 'upng-js';

test('protect-pdf encryption locks PDF so pdfjs requires exact password to open', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([400, 300]);
  page.drawText('Top Secret Audit Page', { x: 40, y: 200, size: 16, font });

  doc.encrypt({
    userPassword: 'OminiSecret99',
    ownerPassword: 'OminiOwner99',
    algorithm: 'AES-256',
    permissions: {
      printing: 'highResolution',
      copying: false,
      modifying: false,
    },
  });

  const encryptedBytes = await doc.save({ useObjectStreams: false });

  // Opening without a password must reject with PasswordException
  await assert.rejects(
    async () => {
      await pdfjsLib.getDocument({ data: new Uint8Array(encryptedBytes) }).promise;
    },
    (err: Error) => {
      return err.name === 'PasswordException' || err.message.toLowerCase().includes('password');
    }
  );

  // Opening with the right password must succeed cleanly
  const unlockedDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(encryptedBytes),
    password: 'OminiSecret99',
  }).promise;
  assert.equal(unlockedDoc.numPages, 1);
  await unlockedDoc.cleanup();

  // Decrypting via @cantoo/pdf-lib and copying into a clean PDFDocument must open without any password
  const loadedEncrypted = await PDFDocument.load(encryptedBytes, { password: 'OminiSecret99' });
  const stripped = await PDFDocument.create();
  const pages = await stripped.copyPages(loadedEncrypted, loadedEncrypted.getPageIndices());
  pages.forEach((p) => stripped.addPage(p));
  const strippedBytes = await stripped.save();

  const openedWithoutPassword = await pdfjsLib.getDocument({
    data: new Uint8Array(strippedBytes),
  }).promise;
  assert.equal(openedWithoutPassword.numPages, 1);
  await openedWithoutPassword.cleanup();
});

test('UPNG palette quantization produces valid PNG smaller than raw RGBA buffer', () => {
  const w = 128;
  const h = 128;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      rgba[idx] = (x * 2) & 255;
      rgba[idx + 1] = (y * 2) & 255;
      rgba[idx + 2] = 180;
      rgba[idx + 3] = 255;
    }
  }

  const encoded = UPNG.encode([rgba.buffer], w, h, 64);
  const bytes = new Uint8Array(encoded);
  // Valid PNG signature: 89 50 4E 47
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);
  assert.equal(bytes[2], 0x4e);
  assert.equal(bytes[3], 0x47);
  assert.ok(bytes.byteLength < rgba.byteLength * 0.2);
});
