import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRecentToolsJson,
  prependRecentTool,
  MAX_RECENT_TOOLS,
} from './recentTools.js';

test('prependRecentTool limits list to 3 most recently accessed tools and moves duplicates to front', () => {
  let list = prependRecentTool([], 'merge-pdf');
  assert.deepEqual(list, ['merge-pdf']);

  list = prependRecentTool(list, 'compress-image');
  assert.deepEqual(list, ['compress-image', 'merge-pdf']);

  list = prependRecentTool(list, 'remove-bg');
  assert.deepEqual(list, ['remove-bg', 'compress-image', 'merge-pdf']);

  // Adding a 4th distinct tool drops the oldest ('merge-pdf')
  list = prependRecentTool(list, 'edit-photo');
  assert.equal(list.length, MAX_RECENT_TOOLS);
  assert.deepEqual(list, ['edit-photo', 'remove-bg', 'compress-image']);

  // Re-opening 'compress-image' promotes it to the top without duplicating
  list = prependRecentTool(list, 'compress-image');
  assert.deepEqual(list, ['compress-image', 'edit-photo', 'remove-bg']);
});

test('parseRecentToolsJson filters invalid tool IDs and safely handles malformed JSON', () => {
  assert.deepEqual(parseRecentToolsJson(null), []);
  assert.deepEqual(parseRecentToolsJson('{bad json'), []);
  assert.deepEqual(
    parseRecentToolsJson(JSON.stringify(['invalid-tool', 'highlight-pdf', 'rename-files', 'highlight-pdf', 'compress-pdf', 'merge-pdf'])),
    ['highlight-pdf', 'rename-files', 'compress-pdf']
  );
});
