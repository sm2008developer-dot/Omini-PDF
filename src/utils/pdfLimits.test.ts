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
  DEFAULT_LIMITS,
} from './pdfLimits';

test('All users have unlimited free PDF operations', () => {
  const freeUser = { plan: 'free' as const, pdfOperationsUsed: 250, aiQueriesUsed: 0 };
  const check = canPerformPdfOperation(freeUser, DEFAULT_LIMITS);
  assert.equal(check.allowed, true);
  assert.equal(check.remaining, Infinity);
  assert.equal(check.max, Infinity);
});

test('AI features are disabled across platform', () => {
  const user = { plan: 'free' as const, pdfOperationsUsed: 0, aiQueriesUsed: 0 };
  const checkAi = canPerformAiQuery(user, DEFAULT_LIMITS);
  assert.equal(checkAi.allowed, false);
  assert.equal(checkAi.remaining, 0);
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
  assert.deepEqual(parsePageRanges('8-15', total), [8, 9, 10]);
  assert.deepEqual(parsePageRanges('', total), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('formatFileSize formats human readable bytes', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1048576 * 2.5), '2.5 MB');
});
