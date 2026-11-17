import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS_CONFIG } from '../types.js';
import { resolveSeoMetadata } from './useSEO.js';

test('Every PDF tool resolves unique SEO title, description, keywords, and canonicalPath', () => {
  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();
  const seenKeywords = new Set<string>();
  const seenPaths = new Set<string>();

  for (const tool of TOOLS_CONFIG) {
    const meta = resolveSeoMetadata({ view: 'tool', toolId: tool.id });

    assert.ok(meta.title.length > 10, `${tool.id} should have a valid SEO title`);
    assert.ok(meta.description.length > 30, `${tool.id} should have a rich SEO description`);
    assert.ok(meta.keywords && meta.keywords.length > 15, `${tool.id} should have unique SEO keywords`);

    assert.equal(seenTitles.has(meta.title), false, `Duplicate SEO title for ${tool.id}`);
    assert.equal(seenDescriptions.has(meta.description), false, `Duplicate SEO description for ${tool.id}`);
    assert.equal(seenKeywords.has(meta.keywords!), false, `Duplicate SEO keywords for ${tool.id}`);
    assert.equal(seenPaths.has(meta.canonicalPath), false, `Duplicate canonicalPath for ${tool.id}`);

    seenTitles.add(meta.title);
    seenDescriptions.add(meta.description);
    seenKeywords.add(meta.keywords!);
    seenPaths.add(meta.canonicalPath);
  }
});

test('Non-tool views resolve correct route metadata and respect custom overrides', () => {
  const homeMeta = resolveSeoMetadata({ view: 'home', path: '/' });
  assert.equal(homeMeta.canonicalPath, '/');
  assert.ok(homeMeta.keywords?.includes('omini pdf'));

  const historyMeta = resolveSeoMetadata({ view: 'dashboard', path: '/history' });
  assert.equal(historyMeta.canonicalPath, '/history');
  assert.ok(historyMeta.title.includes('History'));

  const customMeta = resolveSeoMetadata({
    view: 'tool',
    toolId: 'merge-pdf',
    customTitle: 'Custom Merge Title',
    customKeywords: 'custom, pdf, keywords',
  });
  assert.equal(customMeta.title, 'Custom Merge Title');
  assert.equal(customMeta.keywords, 'custom, pdf, keywords');
});
