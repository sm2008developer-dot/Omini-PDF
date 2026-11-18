/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolId } from '../types.js';

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
  'pdf-to-word': '/pdf-to-word',
  'word-to-pdf': '/word-to-pdf',
  'pdf-to-excel': '/pdf-to-excel',
  'edit-pdf': '/edit-pdf',
  'sign-pdf': '/sign-pdf',
  'unlock-pdf': '/unlock-pdf',
  'protect-pdf': '/protect-pdf',
  'ocr-pdf': '/ocr-pdf',
  'watermark-pdf': '/watermark-pdf',
  'edit-metadata': '/edit-pdf-metadata',
  'rotate-pdf': '/rotate-pdf',
  'page-numbers': '/page-numbers',
  'remove-pages': '/remove-pages',
  'highlight-pdf': '/highlight-pdf',
  'image-to-pdf': '/image-to-pdf',
  'pdf-to-image': '/pdf-to-image',
  'compress-image': '/compress-image',
  'resize-image': '/resize-image',
  'edit-photo': '/edit-photo',
  'highlight-photo': '/highlight-photo',
  'rename-files': '/rename-files',
};

export const PATH_TO_TOOL_MAP: Record<string, ToolId> = {
  '/merge-pdf': 'merge-pdf',
  '/split-pdf': 'split-pdf',
  '/compress-pdf': 'compress-pdf',
  '/pdf-to-word': 'pdf-to-word',
  '/word-to-pdf': 'word-to-pdf',
  '/pdf-to-excel': 'pdf-to-excel',
  '/edit-pdf': 'edit-pdf',
  '/sign-pdf': 'sign-pdf',
  '/unlock-pdf': 'unlock-pdf',
  '/protect-pdf': 'protect-pdf',
  '/ocr-pdf': 'ocr-pdf',
  '/watermark-pdf': 'watermark-pdf',
  '/edit-pdf-metadata': 'edit-metadata',
  '/edit-metadata': 'edit-metadata',
  '/rotate-pdf': 'rotate-pdf',
  '/page-numbers': 'page-numbers',
  '/remove-pages': 'remove-pages',
  '/highlight-pdf': 'highlight-pdf',
  '/image-to-pdf': 'image-to-pdf',
  '/jpg-to-pdf': 'image-to-pdf',
  '/png-to-pdf': 'image-to-pdf',
  '/jpg-png-to-pdf': 'image-to-pdf',
  '/pdf-to-image': 'pdf-to-image',
  '/compress-image': 'compress-image',
  '/resize-image': 'resize-image',
  '/edit-photo': 'edit-photo',
  '/highlight-photo': 'highlight-photo',
  '/rename-files': 'rename-files',
};

export const SEO_METADATA_REGISTRY: Record<string, RouteMeta> = {
  '/': {
    title: 'Omini PDF - 100% Free Online PDF & Photo Suite | Convert, Edit, Sign, OCR & Compress',
    description: '100% free, unlimited online PDF & photo suite. PDF to Word, Word to PDF, PDF to Excel, Edit PDF, Sign PDF, Unlock PDF, OCR PDF, JPG/PNG to PDF, Merge, Split & Compress directly in your browser.',
    canonicalPath: '/',
    keywords: 'free online pdf editor, pdf to word free, word to pdf converter, pdf to excel free, unlock pdf free, edit pdf online, sign pdf free, ocr pdf free, jpg png to pdf, merge pdf, compress pdf to 100kb, omini pdf',
  },
  '/merge-pdf': {
    title: 'Merge PDF Free Online - Omini PDF',
    description: 'Merge and combine multiple PDF documents into one single file online for free. Fast, client-side secure processing with no file limits and zero watermarks.',
    canonicalPath: '/merge-pdf',
    keywords: 'merge pdf, combine pdf online, free pdf merger, join pdf files, merge pdf no watermark',
  },
  '/split-pdf': {
    title: 'Split PDF Free Online - Omini PDF',
    description: 'Split PDF files by custom page ranges or extract all pages into separate PDF documents in a single ZIP archive. 100% free and client-side secure.',
    canonicalPath: '/split-pdf',
    keywords: 'split pdf, extract pdf pages, separate pdf pages online free, cut pdf pages',
  },
  '/compress-pdf': {
    title: 'Compress PDF Free Online - Omini PDF',
    description: 'Compress PDF files online while maintaining crisp quality. Reduce PDF file weight to 100KB, 200KB, or 500KB with zero file watermarks — 100% free.',
    canonicalPath: '/compress-pdf',
    keywords: 'compress pdf, reduce pdf size, compress pdf to 100kb, free pdf compressor, shrink pdf online',
  },
  '/pdf-to-word': {
    title: 'PDF to Word Converter Free (.docx) - Omini PDF',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files online for free right in your browser with zero uploads and zero watermarks.',
    canonicalPath: '/pdf-to-word',
    keywords: 'pdf to word, pdf to docx converter free, convert pdf to editable word online, free pdf to doc',
  },
  '/word-to-pdf': {
    title: 'Word to PDF Converter Free (.docx to .pdf) - Omini PDF',
    description: 'Convert Word (.docx / .doc) documents into clean, crisp multi-page PDF files online for free with headings, tables, and Unicode support.',
    canonicalPath: '/word-to-pdf',
    keywords: 'word to pdf, docx to pdf converter free, convert word document to pdf online free',
  },
  '/pdf-to-excel': {
    title: 'PDF to Excel Converter Free (.xlsx / .csv) - Omini PDF',
    description: 'Extract tables and structured rows from PDF documents into downloadable Excel (.xlsx) or CSV spreadsheets 100% free inside your browser.',
    canonicalPath: '/pdf-to-excel',
    keywords: 'pdf to excel, pdf to xlsx free, extract pdf table to excel, convert pdf to csv online free',
  },
  '/edit-pdf': {
    title: 'Edit PDF Online Free (Text, Whiteout, Draw & Shapes) - Omini PDF',
    description: 'Edit PDF documents online for free: add text boxes, whiteout mistakes, draw freehand, add rectangles, and highlight sections with live preview.',
    canonicalPath: '/edit-pdf',
    keywords: 'edit pdf online free, add text to pdf, whiteout pdf online, free pdf editor no watermark',
  },
  '/sign-pdf': {
    title: 'Sign PDF Online Free (Draw, Type or Upload Signature) - Omini PDF',
    description: 'Sign PDF documents electronically for free. Draw your signature, type calligraphic text, or upload a signature photo and place it anywhere on any PDF page.',
    canonicalPath: '/sign-pdf',
    keywords: 'sign pdf online free, e-signature pdf tool, add signature to pdf, digital signature pdf free',
  },
  '/unlock-pdf': {
    title: 'Unlock PDF Online Free (Remove PDF Password) - Omini PDF',
    description: 'Remove password protection and printing/copying restrictions from encrypted PDF documents cleanly in your browser 100% free.',
    canonicalPath: '/unlock-pdf',
    keywords: 'unlock pdf, remove password from pdf free, decrypt pdf online, unprotect pdf file',
  },
  '/protect-pdf': {
    title: 'Protect PDF Password Online Free - Omini PDF',
    description: 'Lock and protect PDF files with military-grade 256-bit AES encryption for free. Set custom passwords to prevent unauthorized viewing.',
    canonicalPath: '/protect-pdf',
    keywords: 'protect pdf, password protect pdf online, encrypt pdf free, lock pdf document',
  },
  '/ocr-pdf': {
    title: 'OCR PDF Free Online (Scanned PDF & Image to Searchable Text) - Omini PDF',
    description: 'Extract selectable text from scanned PDFs and photos using client-side Tesseract OCR (English, Bengali, Hindi) and export Searchable PDF or TXT.',
    canonicalPath: '/ocr-pdf',
    keywords: 'ocr pdf free, image to text ocr, scanned pdf to searchable pdf, bengali ocr pdf, hindi ocr pdf',
  },
  '/watermark-pdf': {
    title: 'Watermark PDF Free Online - Omini PDF',
    description: 'Overlay custom text watermarks, confidential stamps, and copyright labels across PDF pages with customizable opacity, rotation, and color.',
    canonicalPath: '/watermark-pdf',
    keywords: 'add watermark to pdf, stamp pdf online, watermark pdf free, draft watermark pdf',
  },
  '/edit-pdf-metadata': {
    title: 'Edit PDF Metadata Free - Omini PDF',
    description: 'View and update PDF document properties including Title, Author, Subject, and Keywords instantly in your browser with complete privacy.',
    canonicalPath: '/edit-pdf-metadata',
    keywords: 'edit pdf metadata, change pdf author, update pdf title, pdf metadata viewer, edit pdf properties',
  },
  '/rotate-pdf': {
    title: 'Rotate PDF Online Free - Omini PDF',
    description: 'Rotate PDF pages 90, 180, or 270 degrees clockwise or counterclockwise. Permanently save rotated PDF documents 100% free.',
    canonicalPath: '/rotate-pdf',
    keywords: 'rotate pdf, rotate pdf online free, turn pdf pages, permanently rotate pdf, change pdf orientation',
  },
  '/page-numbers': {
    title: 'Add Page Numbers to PDF Free - Omini PDF',
    description: 'Insert customizable page numbers and footer labels into PDF files online for free with live document preview.',
    canonicalPath: '/page-numbers',
    keywords: 'add page numbers to pdf, number pdf pages online, insert page number pdf, paginate pdf free',
  },
  '/remove-pages': {
    title: 'Remove Pages from PDF Free - Omini PDF',
    description: 'Delete unwanted pages from PDF documents easily and for free. Select page numbers to remove and download your clean PDF instantly.',
    canonicalPath: '/remove-pages',
    keywords: 'remove pages from pdf, delete pdf pages, delete pages from pdf free, cut pages from pdf online',
  },
  '/highlight-pdf': {
    title: 'Highlight PDF Online Free - Omini PDF',
    description: 'Highlight important sections and add text annotations directly onto PDF pages in your browser with instant live preview and zero watermarks.',
    canonicalPath: '/highlight-pdf',
    keywords: 'highlight pdf online, annotate pdf online, pdf highlighter tool, add notes to pdf',
  },
  '/image-to-pdf': {
    title: 'JPG, PNG & WebP to PDF Converter Free - Omini PDF',
    description: 'Convert JPG, PNG, and WebP photos into clean, multi-page PDF documents for free. Reorder images, choose A4/Letter/Fit, and download instantly.',
    canonicalPath: '/image-to-pdf',
    keywords: 'jpg to pdf, png to pdf, jpg png to pdf converter, image to pdf, convert photos to pdf online free',
  },
  '/pdf-to-image': {
    title: 'PDF to Image Converter Free - Omini PDF',
    description: 'Convert PDF pages into high-resolution PNG or JPEG images for free. Download individual page images or all pages bundled in a ZIP file.',
    canonicalPath: '/pdf-to-image',
    keywords: 'pdf to image, pdf to png, pdf to jpg converter online, extract pdf pages as image',
  },
  '/compress-image': {
    title: 'Compress Image (PNG, JPG, WebP) to Target KB Free - Omini PDF',
    description: 'Reduce PNG, JPEG, and WebP image file sizes to exact KB targets (20KB, 50KB, 100KB, 200KB) cleanly inside your browser with live quality preview.',
    canonicalPath: '/compress-image',
    keywords: 'compress image, reduce photo size kb, compress png jpg webp, compress image to 50kb, shrink photo online free',
  },
  '/resize-image': {
    title: 'Photo Aspect Ratio & Format Converter (PNG/JPG/WebP) - Omini PDF',
    description: 'Change photo aspect ratio (1:1, 4:3, 16:9, 9:16, Custom WxH) and convert images between PNG, JPG, and WebP formats 100% free in browser.',
    canonicalPath: '/resize-image',
    keywords: 'change image aspect ratio, resize photo online free, convert png to webp, jpg to png converter, crop ratio 16:9',
  },
  '/edit-photo': {
    title: 'Free Photo Editor (Crop, Rotate & 16 Filters) - Omini PDF',
    description: 'Crop images interactively, rotate, flip, adjust brightness, contrast, saturation, and apply 16 tonal filters offline in browser.',
    canonicalPath: '/edit-photo',
    keywords: 'photo editor online free, crop photo online, image filters sepia bw, brightness contrast photo editor',
  },
  '/highlight-photo': {
    title: 'Photo Highlighter & Spotlight Tool Free - Omini PDF',
    description: 'Highlight key areas on screenshots and photos using neon markers, highlight boxes, or spotlight dim masks cleanly in your browser.',
    canonicalPath: '/highlight-photo',
    keywords: 'highlight photo online, image highlighter tool, spotlight screenshot area, mark photo free',
  },
  '/rename-files': {
    title: 'Rename PDF & Photos Online Free (Batch Renamer) - Omini PDF',
    description: 'Rename single or multiple PDF, PNG, JPG, and WebP files with prefixes, suffixes, sequential numbering, and instant ZIP download.',
    canonicalPath: '/rename-files',
    keywords: 'rename pdf online, batch rename photos free, change image filename, bulk file renamer browser',
  },
  '/faqs': {
    title: 'FAQs - Omini PDF (100% Free PDF Tools)',
    description: 'Find answers to common questions about Omini PDF free tools, browser privacy standards, and client-side PDF processing.',
    canonicalPath: '/faqs',
    keywords: 'omini pdf faqs, is omini pdf free, is omini pdf safe, pdf privacy faqs',
  },
  '/history': {
    title: 'PDF Processing History - Omini PDF',
    description: 'View your processed PDF documents, operation logs, and quick re-downloads on Omini PDF.',
    canonicalPath: '/history',
    keywords: 'pdf history, recent pdf operations, processed pdf downloads, omini pdf history',
  },
  '/dashboard': {
    title: 'Dashboard & History - Omini PDF',
    description: 'View your processed PDF documents and download history on Omini PDF.',
    canonicalPath: '/dashboard',
    keywords: 'omini pdf dashboard, pdf processing log, saved pdf history',
  },
  '/admin': {
    title: 'Admin - Omini PDF',
    description: 'Omini PDF administrative console.',
    canonicalPath: '/admin',
  },
};

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return CANONICAL_BASE;
}

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
  if (pathname === '/history') {
    return { view: 'dashboard', toolId: null, path: '/history' };
  }
  if (pathname === '/dashboard') {
    return { view: 'dashboard', toolId: null, path: '/dashboard' };
  }
  if (pathname === '/admin') {
    return { view: 'admin', toolId: null, path: '/admin' };
  }
  if (pathname === '/faqs') {
    return { view: 'home', toolId: null, scrollToSection: 'faqs', path: '/faqs' };
  }

  // 3. Backward compatibility for legacy hash links (#merge-pdf, #faqs, etc.)
  if (hash) {
    const hashAsPath = '/' + hash;
    if (PATH_TO_TOOL_MAP[hashAsPath]) {
      return {
        view: 'tool',
        toolId: PATH_TO_TOOL_MAP[hashAsPath],
        path: TOOL_PATH_MAP[PATH_TO_TOOL_MAP[hashAsPath]],
      };
    }
    if (hash === 'faqs') {
      return { view: 'home', toolId: null, scrollToSection: 'faqs', path: '/faqs' };
    }
    if (hash === 'tools' || hash === 'tools-grid') {
      return { view: 'home', toolId: null, scrollToSection: 'tools-grid', path: '/' };
    }
  }

  return { view: 'home', toolId: null, path: '/' };
}

/**
 * Updates DOM title, meta description, canonical, and OpenGraph tags dynamically per-page
 */
export function updateDocumentSeo(
  path?: string,
  overrides?: { title?: string; description?: string; keywords?: string }
): void {
  if (typeof document === 'undefined') return;

  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');

  let clean = currentPath.split('#')[0].split('?')[0].trim();
  if (clean.startsWith('http')) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      clean = '/';
    }
  }

  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }
  clean = clean.replace(/\/$/, '') || '/';

  if (!SEO_METADATA_REGISTRY[clean]) {
    const matchedTool = Object.entries(TOOL_PATH_MAP).find(
      ([tId, p]) => tId === clean.slice(1) || p === clean
    );
    if (matchedTool) {
      clean = matchedTool[1];
    }
  }

  const baseMeta = SEO_METADATA_REGISTRY[clean] || SEO_METADATA_REGISTRY['/'];
  const meta: RouteMeta = {
    ...baseMeta,
    title: overrides?.title || baseMeta.title,
    description: overrides?.description || baseMeta.description,
    keywords: overrides?.keywords || baseMeta.keywords,
  };

  const activeOrigin = getOrigin();
  const fullCanonical = `${activeOrigin}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
  const socialImage = `${activeOrigin}/og-image.png`;

  document.title = meta.title;
  let titleEl = document.querySelector('title');
  if (!titleEl) {
    titleEl = document.createElement('title');
    document.head.appendChild(titleEl);
  }
  titleEl.textContent = meta.title;

  const metaTitleTag = document.querySelector('meta[name="title"]');
  if (metaTitleTag) {
    metaTitleTag.setAttribute('content', meta.title);
  }

  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', meta.description);

  if (meta.keywords) {
    let kwTag = document.querySelector('meta[name="keywords"]');
    if (!kwTag) {
      kwTag = document.createElement('meta');
      kwTag.setAttribute('name', 'keywords');
      document.head.appendChild(kwTag);
    }
    kwTag.setAttribute('content', meta.keywords);
  }

  let canTag = document.querySelector('link[rel="canonical"]');
  if (!canTag) {
    canTag = document.createElement('link');
    canTag.setAttribute('rel', 'canonical');
    document.head.appendChild(canTag);
  }
  canTag.setAttribute('href', fullCanonical);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', fullCanonical);

  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.setAttribute('content', socialImage);

  const ogSecureImg = document.querySelector('meta[property="og:image:secure_url"]');
  if (ogSecureImg) ogSecureImg.setAttribute('content', socialImage);

  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', meta.title);

  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', meta.description);

  const twImg = document.querySelector('meta[name="twitter:image"]');
  if (twImg) twImg.setAttribute('content', socialImage);

  // Maintain dynamic JSON-LD WebPage schema for tool & route clarity
  let ldScript = document.getElementById('omini-dynamic-jsonld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'omini-dynamic-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: fullCanonical,
    keywords: meta.keywords || '',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Omini PDF',
      url: activeOrigin,
    },
  });
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
