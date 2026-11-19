/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADBLOCK_DISMISS_COOLDOWN_MS,
  evaluateAdBlockerSignals,
  shouldShowAdBlockerNotice,
} from './adBlocker';

test('evaluateAdBlockerSignals returns false when no blocking signals exist', () => {
  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: false,
      baitCollapsed: false,
      networkBlocked: false,
      isOnline: true,
    }),
    false
  );
});

test('evaluateAdBlockerSignals detects DOM bait hiding, bait collapse, or online network block', () => {
  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: true,
      baitCollapsed: false,
      networkBlocked: false,
    }),
    true
  );

  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: false,
      baitCollapsed: true,
      networkBlocked: false,
    }),
    true
  );

  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: false,
      baitCollapsed: false,
      networkBlocked: true,
      isOnline: true,
    }),
    true
  );
});

test('evaluateAdBlockerSignals prevents false positives offline and on admin routes', () => {
  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: false,
      baitCollapsed: false,
      networkBlocked: true,
      isOnline: false,
    }),
    false
  );

  assert.equal(
    evaluateAdBlockerSignals({
      baitHidden: true,
      baitCollapsed: true,
      networkBlocked: true,
      isOnline: true,
      isAdminRoute: true,
    }),
    false
  );
});

test('shouldShowAdBlockerNotice enforces 24-hour dismissal cooldown cleanly', () => {
  const now = 1_700_000_000_000;
  assert.equal(shouldShowAdBlockerNotice(null, now), true);
  assert.equal(shouldShowAdBlockerNotice(now - 60_000, now), false);
  assert.equal(
    shouldShowAdBlockerNotice(now - ADBLOCK_DISMISS_COOLDOWN_MS + 1000, now),
    false
  );
  assert.equal(
    shouldShowAdBlockerNotice(now - ADBLOCK_DISMISS_COOLDOWN_MS, now),
    true
  );
});
