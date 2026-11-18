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
