/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPerformPdfOperation,
  canPerformAiQuery,
  calculateSavings,
  parsePageRanges,
  formatFileSize,
  formatINR,
  DEFAULT_LIMITS,
  isSubscriptionActive,
  getRemainingSubscriptionDays,
} from './pdfLimits';

test('Free user PDF quota enforcement', () => {
  const freeUser = { plan: 'free' as const, pdfOperationsUsed: 2, aiQueriesUsed: 0 };
  const check1 = canPerformPdfOperation(freeUser, DEFAULT_LIMITS);
  assert.equal(check1.allowed, true);
  assert.equal(check1.remaining, 1);
  assert.equal(check1.max, 3);

  const exhaustedUser = { plan: 'free' as const, pdfOperationsUsed: 3, aiQueriesUsed: 0 };
  const check2 = canPerformPdfOperation(exhaustedUser, DEFAULT_LIMITS);
  assert.equal(check2.allowed, false);
  assert.equal(check2.remaining, 0);
});

test('Pro user with active 30-day subscription has unlimited access', () => {
  const futureExpiry = new Date(Date.now() + 15 * 86400000).toISOString();
  const proUser = {
    plan: 'pro' as const,
    pdfOperationsUsed: 50,
    aiQueriesUsed: 120,
    proExpiresAt: futureExpiry,
    subscriptionStatus: 'active' as const,
  };
  assert.equal(isSubscriptionActive(proUser), true);
  assert.equal(getRemainingSubscriptionDays(futureExpiry), 15);

  const checkPdf = canPerformPdfOperation(proUser, DEFAULT_LIMITS);
  assert.equal(checkPdf.allowed, true);
  assert.equal(checkPdf.remaining, Infinity);

  const checkAi = canPerformAiQuery(proUser, DEFAULT_LIMITS);
  assert.equal(checkAi.allowed, true);
  assert.equal(checkAi.remaining, Infinity);
});

test('Pro user with expired 30-day subscription is reverted to free limits', () => {
  const pastExpiry = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const expiredUser = {
    plan: 'pro' as const,
    pdfOperationsUsed: 3,
    aiQueriesUsed: 5,
    proExpiresAt: pastExpiry,
    subscriptionStatus: 'expired' as const,
  };
  assert.equal(isSubscriptionActive(expiredUser), false);
  assert.equal(getRemainingSubscriptionDays(pastExpiry), 0);

  const checkPdf = canPerformPdfOperation(expiredUser, DEFAULT_LIMITS);
  assert.equal(checkPdf.allowed, false);
  assert.equal(checkPdf.remaining, 0);

  const checkAi = canPerformAiQuery(expiredUser, DEFAULT_LIMITS);
  assert.equal(checkAi.allowed, false);
  assert.equal(checkAi.remaining, 0);
});

test('Free user AI queries quota enforcement', () => {
  const freeUser = { plan: 'free' as const, pdfOperationsUsed: 0, aiQueriesUsed: 4 };
  const check1 = canPerformAiQuery(freeUser, DEFAULT_LIMITS);
  assert.equal(check1.allowed, true);
  assert.equal(check1.remaining, 1);
  assert.equal(check1.max, 5);

  const exhaustedAi = { plan: 'free' as const, pdfOperationsUsed: 0, aiQueriesUsed: 5 };
  const check2 = canPerformAiQuery(exhaustedAi, DEFAULT_LIMITS);
  assert.equal(check2.allowed, false);
  assert.equal(check2.remaining, 0);
});

test('calculateSavings returns correct savings and percentage', () => {
  const result = calculateSavings(1000, 400);
  assert.equal(result.savedBytes, 600);
  assert.equal(result.percent, 60);

  const noSavings = calculateSavings(500, 600);
  assert.equal(noSavings.savedBytes, 0);
  assert.equal(noSavings.percent, 0);
});

test('parsePageRanges parses single, range, and mixed inputs correctly', () => {
  const total = 10;
  assert.deepEqual(parsePageRanges('1-3, 5, 8-10', total), [1, 2, 3, 5, 8, 9, 10]);
  assert.deepEqual(parsePageRanges('4, 2, 2, 1', total), [1, 2, 4]);
  assert.deepEqual(parsePageRanges('8-15', total), [8, 9, 10]); // clamped to total
  assert.deepEqual(parsePageRanges('', total), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // empty defaults to all
});

test('formatFileSize formats human readable bytes', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1048576 * 2.5), '2.5 MB');
});

test('formatINR formats currency for Indian Rupee', () => {
  const formatted = formatINR(99);
  assert.ok(formatted.includes('99'));
});

test('extractZapOrderId extracts order IDs from plain text, lowercase, and full URLs', async () => {
  const { extractZapOrderId } = await import('./pdfLimits');

  // Plain ZP string
  assert.equal(extractZapOrderId('ZP1738294719'), 'ZP1738294719');
  // Lowercase zp string
  assert.equal(extractZapOrderId('zp1738294719'), 'ZP1738294719');
  // Full URL with query param ?order_id=ZP...
  assert.equal(
    extractZapOrderId('https://panel.zappay.shop/check.html?order_id=ZP99887766'),
    'ZP99887766'
  );
  // Full URL with query param ?order=ZP...
  assert.equal(
    extractZapOrderId('https://zappay.shop/pay.html?order=zp33445566&status=ok'),
    'ZP33445566'
  );
  // String with whitespace
  assert.equal(extractZapOrderId('   ZP55443322   '), 'ZP55443322');
  // Empty or invalid returns null
  assert.equal(extractZapOrderId(''), null);
  assert.equal(extractZapOrderId('abc'), null);
});

test('computeVoucherDiscount computes correct prices and detects free passes', async () => {
  const { computeVoucherDiscount } = await import('./pdfLimits');

  // 100% OFF voucher
  const freeVoucher = computeVoucherDiscount(99, 100);
  assert.equal(freeVoucher.finalPrice, 0);
  assert.equal(freeVoucher.discountAmount, 99);
  assert.equal(freeVoucher.isFree, true);

  // 50% OFF voucher
  const halfVoucher = computeVoucherDiscount(99, 50);
  assert.equal(halfVoucher.finalPrice, 49); // 99 - 50 = 49
  assert.equal(halfVoucher.discountAmount, 50);
  assert.equal(halfVoucher.isFree, false);

  // 0% discount
  const zeroDiscount = computeVoucherDiscount(99, 0);
  assert.equal(zeroDiscount.finalPrice, 99);
  assert.equal(zeroDiscount.isFree, false);
});

