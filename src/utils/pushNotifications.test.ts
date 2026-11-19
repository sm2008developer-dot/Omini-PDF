/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUSH_PROMPT_COOLDOWN_MS,
  urlBase64ToUint8Array,
  evaluatePushPromptEligibility,
  formatNotificationPayload,
} from './pushNotifications';

test('urlBase64ToUint8Array decodes URL-safe base64 VAPID keys accurately', () => {
  // "Hello!" in base64url is "SGVsbG8h"
  const decoded = urlBase64ToUint8Array('SGVsbG8h');
  assert.deepEqual(Array.from(decoded), [72, 101, 108, 108, 111, 33]);

  // Handles - and _ URL-safe characters and missing padding cleanly
  const urlSafe = urlBase64ToUint8Array('_-8');
  assert.equal(urlSafe.length, 2);
  assert.equal(urlSafe[0], 0xff);
  assert.equal(urlSafe[1], 0xef);
});

test('evaluatePushPromptEligibility respects browser support, permission, subscription, cooldown, and admin routes', () => {
  const now = 1_700_000_000_000;

  // Eligible when supported, default permission, not subscribed, no recent dismissal
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'default',
      subscribed: false,
      dismissedAtMs: null,
      nowMs: now,
    }),
    true
  );

  // Suppressed if unsupported, already subscribed, or permission denied/granted
  assert.equal(
    evaluatePushPromptEligibility({
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      dismissedAtMs: null,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'granted',
      subscribed: true,
      dismissedAtMs: null,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'denied',
      subscribed: false,
      dismissedAtMs: null,
      nowMs: now,
    }),
    false
  );

  // Suppressed during 7-day cooldown and re-enabled after cooldown expires
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'default',
      subscribed: false,
      dismissedAtMs: now - PUSH_PROMPT_COOLDOWN_MS + 5000,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'default',
      subscribed: false,
      dismissedAtMs: now - PUSH_PROMPT_COOLDOWN_MS,
      nowMs: now,
    }),
    true
  );

  // Never prompts on /admin even if forceTestTrigger is true
  assert.equal(
    evaluatePushPromptEligibility({
      supported: true,
      permission: 'default',
      subscribed: false,
      dismissedAtMs: null,
      isAdminRoute: true,
      forceTestTrigger: true,
    }),
    false
  );
});

test('formatNotificationPayload sanitizes unsafe URLs and enforces safe length limits', () => {
  const valid = formatNotificationPayload({
    title: '  New PDF to Excel Tool! ',
    body: 'Convert invoices to XLSX free in seconds.',
    url: '/pdf-to-excel',
    tag: 'launch-v2',
  });
  assert.equal(valid.title, 'New PDF to Excel Tool!');
  assert.equal(valid.url, '/pdf-to-excel');
  assert.equal(valid.tag, 'launch-v2');

  const unsafe = formatNotificationPayload({
    title: '',
    body: '',
    url: 'javascript:alert(1)',
    tag: 'bad tag!@#',
  });
  assert.equal(unsafe.title, 'OminiPDF Update');
  assert.equal(unsafe.url, '/');
  assert.equal(unsafe.tag, 'badtag');
});
