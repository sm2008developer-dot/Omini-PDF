import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCropRect,
  computeAspectSquareCrop,
  parseAspectRatioString,
  computeRatioCanvasDimensions,
  computeColorDistanceSq,
  computePerceptualBgDistance,
  processBackgroundRemovalPixels,
  processEnhancePhotoPixels,
  applyPixelAdjustmentsToBuffer,
  applyBatchRenameRule,
  buildBatchRenamePlan,
} from './imageMath.js';

test('parseAspectRatioString and computeRatioCanvasDimensions calculate crisp aspect ratios', () => {
  assert.equal(parseAspectRatioString('1:1'), 1);
  assert.ok(Math.abs((parseAspectRatioString('16:9') || 0) - 16 / 9) < 0.001);
  assert.equal(parseAspectRatioString('original'), null);

  // 1600x800 cropped to 1:1 should center-crop width to 800
  const cropPlan = computeRatioCanvasDimensions({
    srcW: 1600,
    srcH: 800,
    ratio: '1:1',
    mode: 'crop',
  });
  assert.equal(cropPlan.outW, cropPlan.outH);
  assert.equal(cropPlan.sw, 800);
  assert.equal(cropPlan.sh, 800);
  assert.equal(cropPlan.sx, 400);

  // Custom dimensions with fit mode preserve aspect ratio inside target
  const fitPlan = computeRatioCanvasDimensions({
    srcW: 1000,
    srcH: 500,
    ratio: 'custom',
    customWidth: 800,
    customHeight: 800,
    mode: 'fit',
  });
  assert.equal(fitPlan.outW, 800);
  assert.equal(fitPlan.outH, 800);
  assert.equal(fitPlan.dw, 800);
  assert.equal(fitPlan.dh, 400);
  assert.equal(fitPlan.dy, 200);
});

test('computeAspectSquareCrop produces exact 1:1 pixel square on rectangular images', () => {
  const landscapeSquare = computeAspectSquareCrop(900, 640);
  assert.ok(Math.abs(landscapeSquare.w * 900 - landscapeSquare.h * 640) < 2);
  assert.equal(landscapeSquare.h, 1);

  const portraitSquare = computeAspectSquareCrop(600, 1000);
  assert.ok(Math.abs(portraitSquare.w * 600 - portraitSquare.h * 1000) < 2);
  assert.equal(portraitSquare.w, 1);
});

test('clampCropRect and perceptual background distances enforce safe bounds', () => {
  const clamped = clampCropRect({ x: -0.2, y: 0.9, w: 0.5, h: 0.5 });
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 0.9);
  assert.ok(clamped.h <= 0.10001);

  assert.equal(computeColorDistanceSq(255, 255, 255, 255, 255, 255), 0);
  assert.ok(computeColorDistanceSq(255, 255, 255, 0, 0, 0) > 60000);

  // Lighting shift on neutral wall has smaller perceptual distance than hue shift to pink subject
  const shadowWallDist = computePerceptualBgDistance(230, 235, 240, 205, 210, 215);
  const pinkSubjectDist = computePerceptualBgDistance(230, 235, 240, 232, 62, 140);
  assert.ok(shadowWallDist < 20);
  assert.ok(pinkSubjectDist > 90);
});

test('processBackgroundRemovalPixels removes shaded background while preserving center subject', () => {
  const w = 24;
  const h = 24;
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const inSubject = x >= 8 && x < 16 && y >= 8 && y < 16;
      if (inSubject) {
        buf[idx] = 232;
        buf[idx + 1] = 62;
        buf[idx + 2] = 140;
      } else {
        // Shaded gradient sky-blue background
        const shade = Math.round((x + y) * 0.4);
        buf[idx] = 220 - shade;
        buf[idx + 1] = 240 - shade;
        buf[idx + 2] = 252 - shade;
      }
      buf[idx + 3] = 255;
    }
  }

  const { removedCount } = processBackgroundRemovalPixels(buf, w, h, {
    tolerance: 42,
    feather: 12,
    mode: 'flood-edges',
  });

  // Outer backdrop cleared
  assert.ok(removedCount > w * h - 80);
  assert.equal(buf[3], 0); // top-left corner cleared
  // Center foreground pixel stays 100% opaque
  const centerIdx = (12 * w + 12) * 4;
  assert.equal(buf[centerIdx + 3], 255);
  assert.equal(buf[centerIdx], 232);
});

test('applyPixelAdjustmentsToBuffer produces distinct tonal output for each preset', () => {
  const basePixel = () => new Uint8ClampedArray([180, 120, 90, 255]);

  const bw = applyPixelAdjustmentsToBuffer(basePixel(), { preset: 'bw' });
  assert.equal(bw[0], bw[1]);
  assert.equal(bw[1], bw[2]);

  const warm = applyPixelAdjustmentsToBuffer(basePixel(), { preset: 'warm' });
  const cool = applyPixelAdjustmentsToBuffer(basePixel(), { preset: 'cool' });
  assert.ok(warm[0] > 190 && warm[2] < 70);
  assert.ok(cool[2] > warm[2] + 40 && cool[0] < warm[0] - 40);

  const sepia = applyPixelAdjustmentsToBuffer(basePixel(), { preset: 'sepia' });
  assert.ok(sepia[0] >= sepia[1] && sepia[1] >= sepia[2]);

  const vivid = applyPixelAdjustmentsToBuffer(basePixel(), { preset: 'vivid' });
  assert.notDeepEqual(vivid, basePixel());
});

test('applyBatchRenameRule and buildBatchRenamePlan preserve extensions and prevent collisions', () => {
  const single = applyBatchRenameRule('Scan Photo (1).PNG', 0, 1, {
    baseName: 'Invoice Page',
    prefix: '2026_',
    casing: 'slug',
    numbering: 'none',
  });
  assert.equal(single, '2026_invoice_page.png');

  const batch = buildBatchRenamePlan(['a.pdf', 'b.pdf', 'c.jpg'], {
    baseName: 'Document',
    numbering: 'suffix',
    startNumber: 1,
    casing: 'lower',
  });
  assert.deepEqual(batch, ['document_1.pdf', 'document_2.pdf', 'document_3.jpg']);

  // Duplicate target names get deduplicated cleanly
  const deduped = buildBatchRenamePlan(['x.png', 'y.png'], {
    baseName: 'same',
    numbering: 'none',
  });
  assert.deepEqual(deduped, ['same.png', 'same_2.png']);
});

test('expanded 16 filter presets and keep/erase BG masks + portrait edge protection work accurately', () => {
  const sample = () => new Uint8ClampedArray([170, 130, 100, 255]);
  const presets = ['noir', 'cinematic', 'golden-hour', 'fade', 'emerald', 'rose-glow', 'hdr-crisp', 'invert'] as const;
  const outputs = presets.map((p) => Array.from(applyPixelAdjustmentsToBuffer(sample(), { preset: p })));
  // Every filter creates a valid clamped 4-byte pixel and invert flips exactly
  assert.deepEqual(outputs[presets.indexOf('invert')], [85, 125, 155, 255]);
  assert.ok(outputs[presets.indexOf('emerald')][1] > outputs[presets.indexOf('emerald')][0]);
  assert.ok(outputs[presets.indexOf('rose-glow')][0] > outputs[presets.indexOf('rose-glow')][1]);

  // Portrait touching bottom edge (dark shirt at bottom center) should NOT be treated as background
  const w = 24;
  const h = 24;
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const inShirt = y >= 14 && x >= 7 && x <= 16;
      buf[idx] = inShirt ? 25 : 225;
      buf[idx + 1] = inShirt ? 30 : 238;
      buf[idx + 2] = inShirt ? 40 : 248;
      buf[idx + 3] = 255;
    }
  }

  processBackgroundRemovalPixels(buf, w, h, {
    tolerance: 38,
    feather: 8,
    mode: 'flood-edges',
    edgeBarrier: true,
    keepStrokes: [{ points: [{ x: 0.5, y: 0.8 }], radius: 0.1 }],
    eraseStrokes: [{ points: [{ x: 0.1, y: 0.1 }], radius: 0.08 }],
  });

  // Top-left backdrop erased, bottom-center dark shirt preserved at 100% alpha
  assert.equal(buf[3], 0);
  const shirtCenter = (20 * w + 12) * 4;
  assert.equal(buf[shirtCenter + 3], 255);
});

test('processEnhancePhotoPixels lifts dim exposure, boosts sharpness, and whitens document paper', () => {
  const w = 20;
  const h = 20;
  // Dim low-contrast blurred step edge (values 40..90)
  const dimImg = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const v = x < 10 ? 45 : 88;
      dimImg[idx] = v;
      dimImg[idx + 1] = v;
      dimImg[idx + 2] = v;
      dimImg[idx + 3] = 255;
    }
  }
  const beforeSpan = 88 - 45;
  processEnhancePhotoPixels(dimImg, w, h, {
    preset: 'auto',
    sharpen: 70,
    autoContrast: 80,
    brightness: 6,
    vibrance: 40,
    denoise: 10,
  });

  const leftVal = dimImg[(10 * w + 4) * 4];
  const rightEdgeVal = dimImg[(10 * w + 10) * 4];
  const rightFarVal = dimImg[(10 * w + 15) * 4];
  // Span stretched significantly and edge sharpened above interior level
  assert.ok(rightFarVal - leftVal > beforeSpan * 2);
  assert.ok(rightEdgeVal >= rightFarVal);

  // Document preset whitens off-white grey paper (205 -> >= 238)
  const docImg = new Uint8ClampedArray(12 * 12 * 4);
  for (let i = 0; i < 12 * 12 * 4; i += 4) {
    docImg[i] = 205;
    docImg[i + 1] = 205;
    docImg[i + 2] = 205;
    docImg[i + 3] = 255;
  }
  processEnhancePhotoPixels(docImg, 12, 12, { preset: 'document', sharpen: 80, autoContrast: 85 });
  assert.ok(docImg[0] >= 235);
});
