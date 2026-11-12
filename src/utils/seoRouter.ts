/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolId, TOOLS_CONFIG } from '../types.js';

export const CANONICAL_BASE = 'https://ominipdf.ai.studio';

export interface RouteMeta {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
}

export const TOOL_PATH_MAP: Record<ToolId, string> = {
  'merge-pdf': '/merge-pdf',
  'split-pdf': '/split-pdf',
  'compress-pdf': '/compress-pdf',
  'protect-pdf': '/protect-pdf',
  'watermark-pdf': '/watermark-pdf',
  'edit-metadata': '/edit-pdf-metadata',
  'rotate-pdf': '/rotate-pdf',
  'page-numbers': '/page-numbers',
  'remove-pages': '/remove-pages',
  'image-to-pdf': '/image-to-pdf',
  'pdf-to-image': '/pdf-to-image',
  'ai-summarizer': '/ai-summarizer',
  'ai-chat': '/ai-chat',
  'ai-keypoints': '/ai-extract',
  'ai-qa': '/ai-qa',
};

export const PATH_TO_TOOL_MAP: Record<string, ToolId> = {
  '/merge-pdf': 'merge-pdf',
  '/split-pdf': 'split-pdf',
  '/compress-pdf': 'compress-pdf',
  '/protect-pdf': 'protect-pdf',
  '/watermark-pdf': 'watermark-pdf',
  '/edit-pdf-metadata': 'edit-metadata',
  '/edit-metadata': 'edit-metadata',
  '/rotate-pdf': 'rotate-pdf',
  '/page-numbers': 'page-numbers',
  '/remove-pages': 'remove-pages',
  '/image-to-pdf': 'image-to-pdf',
  '/pdf-to-image': 'pdf-to-image',
  '/ai-summarizer': 'ai-summarizer',
  '/ai-chat': 'ai-chat',
  '/ai-extract': 'ai-keypoints',
  '/ai-keypoints': 'ai-keypoints',
  '/ai-qa': 'ai-qa',
};

export const SEO_METADATA_REGISTRY: Record<string, RouteMeta> = {
  '/': {
    title: 'Omini PDF - Free AI PDF Suite | Merge, Split, Compress & Edit PDF Online',
    description: 'The #1 free online PDF editor & AI document assistant. Merge, split, compress, protect, watermark, convert to images, and summarize PDFs with Gemini AI.',
    canonicalPath: '/',
    keywords: 'online pdf editor, free pdf tools, merge pdf free, split pdf, compress pdf online, add watermark to pdf, protect pdf password, image to pdf, pdf to jpg, ai pdf summarizer, chat with pdf',
  },
  '/merge-pdf': {
    title: 'Merge PDF - Omini PDF',
    description: 'Merge and combine multiple PDF documents into one single file online for free. Fast, client-side secure processing with no file limits and zero watermarks.',
    canonicalPath: '/merge-pdf',
    keywords: 'merge pdf, combine pdf online, free pdf merger, join pdf files, merge pdf no watermark',
  },
  '/split-pdf': {
    title: 'Split PDF - Omini PDF',
    description: 'Split PDF files by custom page ranges or extract all pages into separate PDF documents in a single ZIP archive. 100% free and client-side secure.',
    canonicalPath: '/split-pdf',
    keywords: 'split pdf, extract pdf pages, separate pdf pages online free, cut pdf pages',
  },
  '/compress-pdf': {
    title: 'Compress PDF - Omini PDF',
    description: 'Compress PDF files online while maintaining crisp quality. Reduce PDF file weight to 100KB, 200KB, or 500KB with zero file watermarks.',
    canonicalPath: '/compress-pdf',
    keywords: 'compress pdf, reduce pdf size, compress pdf to 100kb, free pdf compressor, shrink pdf online',
  },
  '/protect-pdf': {
    title: 'Protect PDF - Omini PDF',
    description: 'Lock and protect PDF files with military-grade 256-bit AES encryption. Set custom master and user passwords to prevent unauthorized viewing.',
    canonicalPath: '/protect-pdf',
    keywords: 'protect pdf, password protect pdf online, encrypt pdf, lock pdf document',
  },
  '/watermark-pdf': {
    title: 'Watermark PDF - Omini PDF',
    description: 'Overlay custom text watermarks, confidential stamps, and copyright labels across PDF pages with customizable opacity, rotation, and color.',
    canonicalPath: '/watermark-pdf',
    keywords: 'add watermark to pdf, stamp pdf online, watermark pdf free, draft watermark pdf',
  },
  '/edit-pdf-metadata': {
    title: 'Edit PDF Metadata - Omini PDF',
    description: 'View and update PDF document properties including Title, Author, Subject, and Keywords instantly in your browser with complete privacy.',
    canonicalPath: '/edit-pdf-metadata',
    keywords: 'edit pdf metadata, change pdf author, update pdf title, pdf metadata viewer, edit pdf properties',
  },
  '/rotate-pdf': {
    title: 'Rotate PDF Online - Omini PDF',
    description: 'Rotate PDF pages 90, 180, or 270 degrees clockwise or counterclockwise. Permanently save rotated PDF documents for free.',
    canonicalPath: '/rotate-pdf',
    keywords: 'rotate pdf, rotate pdf online free, turn pdf pages, permanently rotate pdf, change pdf orientation',
  },
  '/page-numbers': {
    title: 'Add Page Numbers to PDF - Omini PDF',
    description: 'Insert customizable page numbers, header/footer labels, and Roman/Arabic numeration into PDF files online for free.',
    canonicalPath: '/page-numbers',
    keywords: 'add page numbers to pdf, number pdf pages online, insert page number pdf, paginate pdf free',
  },
  '/remove-pages': {
    title: 'Remove Pages from PDF - Omini PDF',
    description: 'Delete unwanted pages from PDF documents easily. Select page numbers to remove and download your clean PDF instantly.',
    canonicalPath: '/remove-pages',
    keywords: 'remove pages from pdf, delete pdf pages, delete pages from pdf free, cut pages from pdf online',
  },
  '/image-to-pdf': {
    title: 'Image to PDF - Omini PDF',
    description: 'Convert JPG, PNG, and WebP images into clean, multi-page PDF documents. Arrange photos, adjust page margins, and download instantly.',
    canonicalPath: '/image-to-pdf',
    keywords: 'image to pdf, jpg to pdf, png to pdf, convert photos to pdf online free',
  },
  '/pdf-to-image': {
    title: 'PDF to Image - Omini PDF',
    description: 'Convert PDF pages into high-resolution PNG or JPEG images. Download individual page images or all pages bundled in a single ZIP file.',
    canonicalPath: '/pdf-to-image',
    keywords: 'pdf to image, pdf to png, pdf to jpg converter online, extract pdf pages as image',
  },
  '/ai-summarizer': {
    title: 'AI Summarizer - Omini PDF',
    description: 'Summarize lengthy PDF reports, academic papers, and legal agreements in seconds. Powered by Gemini 3.8 Flash and FreeModel AI.',
    canonicalPath: '/ai-summarizer',
    keywords: 'ai pdf summarizer, summarize pdf with ai, gemini ai pdf summary, chatgpt for pdf',
  },
  '/ai-chat': {
    title: 'AI Chat - Omini PDF',
    description: 'Converse directly with any PDF document. Ask questions, clarify clauses, and extract citations with context-grounded AI intelligence.',
    canonicalPath: '/ai-chat',
    keywords: 'chat with pdf, talk to pdf, ask pdf questions, ai document assistant',
  },
  '/ai-extract': {
    title: 'AI Extract - Omini PDF',
    description: 'Instantly extract core deliverables, key metrics, dates, and actionable findings from PDF documents using deep AI analysis.',
    canonicalPath: '/ai-extract',
    keywords: 'extract key points from pdf, ai document extraction, pdf data points, pdf insights',
  },
  '/ai-qa': {
    title: 'AI QA - Omini PDF',
    description: 'Generate comprehensive study questions, exams, and detailed answers from textbooks and reports with AI document intelligence.',
    canonicalPath: '/ai-qa',
    keywords: 'pdf question answer generator, ai study questions from pdf, test generator from pdf',
  },
  '/pricing': {
    title: 'Pricing - Omini PDF',
    description: 'Unlock 30 days of unlimited PDF operations and Gemini AI document queries for just ₹99 via ZapPay UPI. Free starter plan available.',
    canonicalPath: '/pricing',
    keywords: 'omini pdf pricing, free pdf plan, unlimited pdf pass, zappay upi pdf',
  },
  '/faqs': {
    title: 'FAQs - Omini PDF',
    description: 'Find answers to common questions about Omini PDF tools, privacy standards, ZapPay payment verification, and FreeModel AI tokens.',
    canonicalPath: '/faqs',
    keywords: 'omini pdf faqs, is omini pdf free, is omini pdf safe, pdf privacy faqs',
  },
  '/dashboard': {
    title: 'Dashboard - Omini PDF',
    description: 'View your processed PDF documents, active 30-day Pro subscription status, and download history on Omini PDF.',
    canonicalPath: '/dashboard',
  },
  '/admin': {
    title: 'Admin - Omini PDF',
    description: 'Omini PDF administrative dashboard for managing quotas, FreeModel AI engines, ZapPay gateways, and coupon vouchers.',
    canonicalPath: '/admin',
  },
};

/**
 * Resolves current route from window.location path and hash
 */
export function resolveCurrentRoute(): {
  view: 'home' | 'tool' | 'dashboard' | 'admin';
  toolId: ToolId | null;
  scrollToSection?: string;
  path: string;
} {
  if (typeof window === 'undefined') {
    return { view: 'home', toolId: null, path: '/' };
  }

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();

  // 1. Direct path matching for tools
  if (PATH_TO_TOOL_MAP[pathname]) {
    return {
      view: 'tool',
      toolId: PATH_TO_TOOL_MAP[pathname],
      path: pathname,
    };
  }

  // 2. Direct path matching for specific views
  if (pathname === '/dashboard') {
    return { view: 'dashboard', toolId: null, path: '/dashboard' };
  }
  if (pathname === '/admin') {
    return { view: 'admin', toolId: null, path: '/admin' };
  }
  if (pathname === '/pricing') {
    return { view: 'home', toolId: null, scrollToSection: 'pricing', path: '/pricing' };
  }
  if (pathname === '/faqs') {
    return { view: 'home', toolId: null, scrollToSection: 'faqs', path: '/faqs' };
  }

  // 3. Backward compatibility for legacy hash links (#merge-pdf, #pricing, etc.)
  if (hash) {
    const hashAsPath = '/' + hash;
    if (PATH_TO_TOOL_MAP[hashAsPath]) {
      return {
        view: 'tool',
        toolId: PATH_TO_TOOL_MAP[hashAsPath],
        path: TOOL_PATH_MAP[PATH_TO_TOOL_MAP[hashAsPath]],
      };
    }
    if (hash === 'pricing' || hash === 'faqs') {
      return { view: 'home', toolId: null, scrollToSection: hash, path: '/' + hash };
    }
    if (hash === 'tools') {
      return { view: 'home', toolId: null, scrollToSection: 'tools', path: '/' };
    }
  }

  return { view: 'home', toolId: null, path: '/' };
}

/**
 * Updates DOM title, meta description, canonical, and OpenGraph tags dynamically per-page
 */
export function updateDocumentSeo(path?: string): void {
  if (typeof document === 'undefined') return;

  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');

  // Strip origin, hash, and query params if passed full URL
  let clean = currentPath.split('#')[0].split('?')[0].trim();
  if (clean.startsWith('http')) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      clean = '/';
    }
  }

  // Handle bare paths like 'merge-pdf' -> '/merge-pdf'
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }
  clean = clean.replace(/\/$/, '') || '/';

  // Support ToolId lookup directly if path was a toolId
  if (!SEO_METADATA_REGISTRY[clean]) {
    const matchedTool = Object.entries(TOOL_PATH_MAP).find(
      ([tId, p]) => tId === clean.slice(1) || p === clean
    );
    if (matchedTool) {
      clean = matchedTool[1];
    }
  }

  const meta = SEO_METADATA_REGISTRY[clean] || SEO_METADATA_REGISTRY['/'];
  const fullCanonical = `${CANONICAL_BASE}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;

  // 1. Title - dynamically update document.title & <title> tag
  document.title = meta.title;
  let titleEl = document.querySelector('title');
  if (!titleEl) {
    titleEl = document.createElement('title');
    document.head.appendChild(titleEl);
  }
  titleEl.textContent = meta.title;

  let metaTitleTag = document.querySelector('meta[name="title"]');
  if (metaTitleTag) {
    metaTitleTag.setAttribute('content', meta.title);
  }

  // 2. Meta Description
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', meta.description);

  // 2b. Meta Keywords
  if (meta.keywords) {
    let kwTag = document.querySelector('meta[name="keywords"]');
    if (!kwTag) {
      kwTag = document.createElement('meta');
      kwTag.setAttribute('name', 'keywords');
      document.head.appendChild(kwTag);
    }
    kwTag.setAttribute('content', meta.keywords);
  }

  // 3. Canonical URL
  let canTag = document.querySelector('link[rel="canonical"]');
  if (!canTag) {
    canTag = document.createElement('link');
    canTag.setAttribute('rel', 'canonical');
    document.head.appendChild(canTag);
  }
  canTag.setAttribute('href', fullCanonical);

  // 4. OpenGraph Tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', fullCanonical);

  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.setAttribute('content', `${CANONICAL_BASE}/og-image.png`);

  // 5. Twitter Tags
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', meta.title);

  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', meta.description);

  const twImg = document.querySelector('meta[name="twitter:image"]');
  if (twImg) twImg.setAttribute('content', `${CANONICAL_BASE}/og-image.png`);
}

/**
 * Navigates to a path using HTML5 History API without page reload
 */
export function navigateTo(path: string, options?: { replace?: boolean; scrollToTop?: boolean }): void {
  if (typeof window === 'undefined') return;

  const targetPath = path.startsWith('/') ? path : '/' + path;

  if (options?.replace) {
    window.history.replaceState({ path: targetPath }, '', targetPath);
  } else {
    window.history.pushState({ path: targetPath }, '', targetPath);
  }

  updateDocumentSeo(targetPath);

  if (options?.scrollToTop !== false) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
