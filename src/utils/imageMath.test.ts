import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCropRect,
  computeAspectSquareCrop,
  parseAspectRatioString,
  computeRatioCanvasDimensions,
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

test('clampCropRect enforces safe bounds', () => {
  const clamped = clampCropRect({ x: -0.2, y: 0.9, w: 0.5, h: 0.5 });
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 0.9);
  assert.ok(clamped.h <= 0.10001);
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

test('expanded 16 filter presets produce distinct valid output', () => {
  const sample = () => new Uint8ClampedArray([170, 130, 100, 255]);
  const presets = ['noir', 'cinematic', 'golden-hour', 'fade', 'emerald', 'rose-glow', 'hdr-crisp', 'invert'] as const;
  const outputs = presets.map((p) => Array.from(applyPixelAdjustmentsToBuffer(sample(), { preset: p })));
  assert.deepEqual(outputs[presets.indexOf('invert')], [85, 125, 155, 255]);
  assert.ok(outputs[presets.indexOf('emerald')][1] > outputs[presets.indexOf('emerald')][0]);
  assert.ok(outputs[presets.indexOf('rose-glow')][0] > outputs[presets.indexOf('rose-glow')][1]);
});
