/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo } from 'react';
import { ToolId } from '../types.js';
import {
  RouteMeta,
  SEO_METADATA_REGISTRY,
  TOOL_PATH_MAP,
  updateDocumentSeo,
} from '../utils/seoRouter.js';

export interface UseSeoOptions {
  view: 'home' | 'tool' | 'dashboard' | 'admin';
  toolId?: ToolId | null;
  path?: string;
  customTitle?: string;
  customDescription?: string;
  customKeywords?: string;
}

/**
 * Pure helper to resolve unique SEO metadata for the current view or PDF tool.
 */
export function resolveSeoMetadata({
  view,
  toolId,
  path,
  customTitle,
  customDescription,
  customKeywords,
}: UseSeoOptions): RouteMeta {
  let targetPath = '/';

  if (view === 'tool' && toolId) {
    targetPath = TOOL_PATH_MAP[toolId] || '/';
  } else if (view === 'dashboard') {
    targetPath = path === '/history' ? '/history' : '/dashboard';
  } else if (view === 'admin') {
    targetPath = '/admin';
  } else if (path === '/faqs') {
    targetPath = '/faqs';
  }

  const baseMeta = SEO_METADATA_REGISTRY[targetPath] || SEO_METADATA_REGISTRY['/'];

  return {
    title: customTitle || baseMeta.title,
    description: customDescription || baseMeta.description,
    keywords: customKeywords || baseMeta.keywords,
    canonicalPath: baseMeta.canonicalPath,
  };
}

/**
 * Custom React hook that dynamically manages document.title, meta description,
 * unique per-tool keywords, canonical links, OpenGraph, and Twitter card tags.
 */
export function useSEO(options: UseSeoOptions): RouteMeta {
  const { view, toolId, path, customTitle, customDescription, customKeywords } = options;

  const resolvedMeta = useMemo(
    () =>
      resolveSeoMetadata({
        view,
        toolId,
        path,
        customTitle,
        customDescription,
        customKeywords,
      }),
    [view, toolId, path, customTitle, customDescription, customKeywords]
  );

  useEffect(() => {
    updateDocumentSeo(resolvedMeta.canonicalPath, {
      title: customTitle,
      description: customDescription,
      keywords: customKeywords,
    });
  }, [resolvedMeta.canonicalPath, customTitle, customDescription, customKeywords]);

  return resolvedMeta;
}
