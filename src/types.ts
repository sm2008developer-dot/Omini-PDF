/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'protect-pdf'
  | 'watermark-pdf'
  | 'edit-metadata'
  | 'rotate-pdf'
  | 'page-numbers'
  | 'remove-pages'
  | 'highlight-pdf'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'compress-image'
  | 'resize-image'
  | 'edit-photo'
  | 'highlight-photo'
  | 'remove-bg'
  | 'enhance-photo'
  | 'rename-files';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  category: 'pdf' | 'image' | 'utility';
  tagline: string;
  description: string;
  iconName: string;
  badge?: 'Popular' | 'Essential' | 'New' | 'Free';
}

export const TOOLS_CONFIG: ToolDefinition[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf',
    tagline: 'Combine multiple PDFs into one unified document',
    description: 'Merge two or more PDF files in any order you choose with instant download — 100% free.',
    iconName: 'Combine',
    badge: 'Popular',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'pdf',
    tagline: 'Extract specific pages or separate all pages',
    description: 'Split single or multiple page ranges, or extract every page into individual files in a ZIP.',
    iconName: 'Split',
    badge: 'Essential',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    tagline: 'Reduce PDF file size to 100KB, 200KB, or custom target',
    description: 'Shrink PDFs with lossless stream optimization or deep target-KB image compression — 100% free.',
    iconName: 'Minimize2',
    badge: 'Popular',
  },
  {
    id: 'highlight-pdf',
    name: 'PDF Edit & Highlight',
    category: 'pdf',
    tagline: 'Highlight sections and add notes directly on PDF pages',
    description: 'Draw crisp yellow, pink, green, or cyan highlights and text annotations right on PDF pages.',
    iconName: 'Highlighter',
    badge: 'New',
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    category: 'pdf',
    tagline: 'Encrypt and lock documents with custom passwords',
    description: 'Add secure 256-bit password protection and restrict unauthorized copying or printing.',
    iconName: 'Lock',
    badge: 'Essential',
  },
  {
    id: 'watermark-pdf',
    name: 'Add Watermark',
    category: 'pdf',
    tagline: 'Stamp text or custom labels across your pages',
    description: 'Overlay custom watermark text with configurable opacity, rotation, color, and positioning.',
    iconName: 'Stamp',
    badge: 'Free',
  },
  {
    id: 'edit-metadata',
    name: 'Edit PDF Metadata',
    category: 'pdf',
    tagline: 'View and modify PDF title, author, subject, and keywords',
    description: 'Update document metadata properties instantly with secure client-side processing.',
    iconName: 'FileEdit',
    badge: 'Essential',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'pdf',
    tagline: 'Rotate PDF pages permanently by 90°, 180°, or 270°',
    description: 'Fix upside-down scans and orientation issues on all or selected pages.',
    iconName: 'RotateCw',
    badge: 'Popular',
  },
  {
    id: 'page-numbers',
    name: 'Page Numbers',
    category: 'pdf',
    tagline: 'Add custom page numbers to headers or footers',
    description: 'Insert crisp page numbers ("Page 1 of N" or "1") into your PDF with custom positioning.',
    iconName: 'Hash',
    badge: 'Free',
  },
  {
    id: 'remove-pages',
    name: 'Remove Pages',
    category: 'pdf',
    tagline: 'Delete unwanted or blank pages from your PDF',
    description: 'Instantly strip specific pages or page ranges from your document with zero quality loss.',
    iconName: 'Trash2',
    badge: 'Essential',
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    category: 'pdf',
    tagline: 'Convert PNG, JPG, or WebP images into clean PDFs',
    description: 'Turn your photos, scans, and graphic documents into a crisp multi-page PDF in seconds.',
    iconName: 'FileImage',
    badge: 'Free',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    category: 'pdf',
    tagline: 'Extract pages as high-resolution PNG or JPEG images',
    description: 'Render every PDF page into crisp image files downloadable individually or as a ZIP archive.',
    iconName: 'ImageDown',
    badge: 'Free',
  },
  {
    id: 'compress-image',
    name: 'Compress Photo (PNG/JPG/WebP)',
    category: 'image',
    tagline: 'Shrink photo size by target KB or quality across PNG, JPG & WebP',
    description: 'Reduce image weight to exact KB targets (20KB, 50KB, 100KB, 200KB) cleanly in your browser.',
    iconName: 'Minimize2',
    badge: 'Popular',
  },
  {
    id: 'resize-image',
    name: 'Photo Ratio & Format Converter',
    category: 'image',
    tagline: 'Change image aspect ratio (1:1, 16:9, 9:16) & convert formats',
    description: 'Resize, crop-to-fit aspect ratios, and convert photos between PNG, JPG, and WebP formats.',
    iconName: 'Scaling',
    badge: 'Essential',
  },
  {
    id: 'edit-photo',
    name: 'Photo Editor (Crop & Filters)',
    category: 'image',
    tagline: 'Crop, rotate, flip, and apply B&W, Sepia, Vivid, or Warm filters',
    description: 'Interactive crop box, rotation, brightness, contrast, saturation & filters — 100% client-side.',
    iconName: 'SlidersHorizontal',
    badge: 'New',
  },
  {
    id: 'highlight-photo',
    name: 'Photo Highlighter & Spotlight',
    category: 'image',
    tagline: 'Highlight areas with neon markers or spotlight focus on photos',
    description: 'Draw highlighter strokes, boxes, or spotlight dim masks directly onto images & screenshots.',
    iconName: 'Highlighter',
    badge: 'New',
  },
  {
    id: 'remove-bg',
    name: 'Remove Photo Background',
    category: 'image',
    tagline: 'Algorithmic chroma & edge flood-fill background remover',
    description: 'Pick background color or auto-remove edges cleanly with feathering & transparent PNG export.',
    iconName: 'Eraser',
    badge: 'Popular',
  },
  {
    id: 'enhance-photo',
    name: 'Photo Enhance & Sharpen',
    category: 'image',
    tagline: 'Auto-levels contrast, unsharp mask sharpening & clarity boost',
    description: 'Make blurry scans and dim photos crisp using deterministic pixel histogram & sharpening math.',
    iconName: 'Wand2',
    badge: 'New',
  },
  {
    id: 'rename-files',
    name: 'Rename PDF & Photos',
    category: 'utility',
    tagline: 'Batch or single rename PDF, PNG, JPG & WebP filenames',
    description: 'Add prefix, suffix, sequential numbers, find/replace, and download renamed files or ZIP.',
    iconName: 'PenLine',
    badge: 'Free',
  },
];
