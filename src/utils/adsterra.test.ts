/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADSTERRA_BANNERS,
  sanitizeAdsterraKey,
  createAdsterraBannerConfig,
  selectAdsterraBannerForSlot,
  buildAdsterraBannerSrcDoc,
} from './adsterra';

test('ADSTERRA_BANNERS defines both 320x50 and 300x250 units with exact user keys and URLs', () => {
  assert.equal(ADSTERRA_BANNERS.banner_320x50.key, '65be41244b5d389c3a8c4560aaacb4fb');
  assert.equal(ADSTERRA_BANNERS.banner_320x50.width, 320);
  assert.equal(ADSTERRA_BANNERS.banner_320x50.height, 50);
  assert.equal(
    ADSTERRA_BANNERS.banner_320x50.scriptSrc,
    'https://bauval.org/22/65be41244b5d389c3a8c4560aaacb4fb'
  );

  assert.equal(ADSTERRA_BANNERS.banner_300x250.key, '88544a428c1216bfa203febd9647cfd9');
  assert.equal(ADSTERRA_BANNERS.banner_300x250.width, 300);
  assert.equal(ADSTERRA_BANNERS.banner_300x250.height, 250);
  assert.equal(
    ADSTERRA_BANNERS.banner_300x250.scriptSrc,
    'https://bauval.org/22/88544a428c1216bfa203febd9647cfd9'
  );
});

test('createAdsterraBannerConfig builds normalized banner config and sanitizes adKey', () => {
  const config = createAdsterraBannerConfig({
    adKey: "65be41244b5d389c3a8c4560aaacb4fb';alert(1)//",
    width: 320,
    height: 50,
  });
  assert.equal(config.key, '65be41244b5d389c3a8c4560aaacb4fbalert1');
  assert.equal(sanitizeAdsterraKey('abc_123-XYZ'), 'abc_123-XYZ');
  assert.equal(config.width, 320);
  assert.equal(config.height, 50);
  assert.equal(config.format, 'iframe');
  assert.equal(
    config.scriptSrc,
    'https://bauval.org/22/65be41244b5d389c3a8c4560aaacb4fbalert1'
  );

  const clamped = createAdsterraBannerConfig({
    adKey: '88544a428c1216bfa203febd9647cfd9',
    width: 5000,
    height: 10,
  });
  assert.equal(clamped.width, 1200);
  assert.equal(clamped.height, 50);
});

test('selectAdsterraBannerForSlot picks 320x50 for horizontal/top slot and 300x250 for article/feed/bottom slots', () => {
  assert.equal(selectAdsterraBannerForSlot('5477575344', 'responsive').id, 'banner_320x50');
  assert.equal(selectAdsterraBannerForSlot('custom', 'horizontal').id, 'banner_320x50');
  assert.equal(selectAdsterraBannerForSlot('9309009142', 'responsive').id, 'banner_300x250');
  assert.equal(selectAdsterraBannerForSlot('7477499834', 'in-article').id, 'banner_300x250');
  assert.equal(selectAdsterraBannerForSlot('1446830999', 'in-feed').id, 'banner_300x250');
});

test('buildAdsterraBannerSrcDoc emits isolated HTML with exact atOptions key, dimensions, and bauval.org script', () => {
  const html320 = buildAdsterraBannerSrcDoc(ADSTERRA_BANNERS.banner_320x50);
  assert.match(html320, /<meta name="color-scheme" content="dark" \/>/);
  assert.match(html320, /'key' : '65be41244b5d389c3a8c4560aaacb4fb'/);
  assert.match(html320, /'height' : 50/);
  assert.match(html320, /'width' : 320/);
  assert.match(html320, /https:\/\/bauval\.org\/22\/65be41244b5d389c3a8c4560aaacb4fb/);

  const html300 = buildAdsterraBannerSrcDoc(ADSTERRA_BANNERS.banner_300x250);
  assert.match(html300, /<meta name="color-scheme" content="dark" \/>/);
  assert.match(html300, /'key' : '88544a428c1216bfa203febd9647cfd9'/);
  assert.match(html300, /'height' : 250/);
  assert.match(html300, /'width' : 300/);
  assert.match(html300, /https:\/\/bauval\.org\/22\/88544a428c1216bfa203febd9647cfd9/);
});
