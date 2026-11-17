import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHistoryJson,
  prependHistoryItem,
  removeHistoryItemById,
  mergeHistoryLists,
  filterHistoryItems,
  LocalHistoryEntry,
} from './historyStore.js';

const sampleItem = (overrides: Partial<LocalHistoryEntry> = {}): LocalHistoryEntry => ({
  id: 'h1',
  userId: 'guest',
  toolId: 'page-numbers',
  toolName: 'Add Page Numbers',
  fileName: 'Workout_Plan.pdf',
  outputFileName: 'numbered_Workout_Plan.pdf',
  fileSize: 195900,
  pageCount: 1,
  resultSummary: 'Numbered 1 page(s) (bottom-center).',
  timestamp: '2026-11-16T12:00:00.000Z',
  status: 'success',
  source: 'local',
  ...overrides,
});

test('parseHistoryJson handles invalid and empty inputs safely', () => {
  assert.deepEqual(parseHistoryJson(null), []);
  assert.deepEqual(parseHistoryJson('not-json'), []);
  assert.deepEqual(parseHistoryJson('{"foo":"bar"}'), []);

  const valid = JSON.stringify([sampleItem()]);
  assert.equal(parseHistoryJson(valid).length, 1);
});

test('prependHistoryItem enforces max limit and deduplicates by id', () => {
  const list = [sampleItem({ id: 'a' }), sampleItem({ id: 'b' })];
  const updated = prependHistoryItem(list, sampleItem({ id: 'c' }), 2);
  assert.deepEqual(
    updated.map((i) => i.id),
    ['c', 'a']
  );

  const updatedDuplicate = prependHistoryItem(updated, sampleItem({ id: 'a', fileName: 'New.pdf' }), 5);
  assert.equal(updatedDuplicate.length, 2);
  assert.equal(updatedDuplicate[0].id, 'a');
  assert.equal(updatedDuplicate[0].fileName, 'New.pdf');
});

test('removeHistoryItemById removes matching item only', () => {
  const list = [sampleItem({ id: 'a' }), sampleItem({ id: 'b' })];
  const next = removeHistoryItemById(list, 'a');
  assert.deepEqual(
    next.map((i) => i.id),
    ['b']
  );
});

test('mergeHistoryLists deduplicates near-identical local and cloud records and sorts newest first', () => {
  const local = [
    sampleItem({
      id: 'local_1',
      toolName: 'Merge PDF',
      fileName: 'doc1.pdf',
      timestamp: '2026-11-16T12:00:00.000Z',
    }),
  ];
  const cloud = [
    {
      id: 'cloud_dup',
      userId: 'u1',
      toolName: 'Merge PDF',
      fileName: 'doc1.pdf',
      fileSize: 1000,
      resultSummary: 'Merged',
      timestamp: '2026-11-16T12:00:02.000Z',
      status: 'success' as const,
    },
    {
      id: 'cloud_newer',
      userId: 'u1',
      toolName: 'Compress PDF',
      fileName: 'older_other.pdf',
      fileSize: 2000,
      resultSummary: 'Compressed',
      timestamp: '2026-11-16T13:00:00.000Z',
      status: 'success' as const,
    },
  ];

  const merged = mergeHistoryLists(local, cloud);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'cloud_newer');
  assert.equal(merged[1].id, 'local_1');
});

test('filterHistoryItems filters by search query and tool name', () => {
  const list = [
    sampleItem({ id: '1', toolId: 'page-numbers', toolName: 'Add Page Numbers', fileName: 'Alpha.pdf' }),
    sampleItem({ id: '2', toolId: 'merge-pdf', toolName: 'Merge PDF', fileName: 'Beta.pdf' }),
  ];

  assert.equal(filterHistoryItems(list, 'alpha').length, 1);
  assert.equal(filterHistoryItems(list, '', 'merge-pdf').length, 1);
  assert.equal(filterHistoryItems(list, 'beta', 'page-numbers').length, 0);
});
