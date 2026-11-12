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
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'ai-summarizer'
  | 'ai-chat'
  | 'ai-keypoints'
  | 'ai-qa';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  category: 'pdf' | 'ai';
  tagline: string;
  description: string;
  iconName: string;
  badge?: 'Popular' | 'AI' | 'Essential' | 'New';
  proRequired?: boolean;
}

export const TOOLS_CONFIG: ToolDefinition[] = [
  // PDF Tools
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf',
    tagline: 'Combine multiple PDFs into one unified document',
    description: 'Merge two or more PDF files in any order you choose with instant download.',
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
    tagline: 'Reduce file size while preserving high visual quality',
    description: 'Optimize PDF structure, remove redundant streams, and reduce file weight up to 80%.',
    iconName: 'Minimize2',
    badge: 'Popular',
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
    badge: 'New',
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
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    category: 'pdf',
    tagline: 'Extract pages as high-resolution PNG or JPEG images',
    description: 'Render every PDF page into crisp image files downloadable individually or as a ZIP archive.',
    iconName: 'ImageDown',
  },
  // AI Tools
  {
    id: 'ai-summarizer',
    name: 'AI PDF Summarizer',
    category: 'ai',
    tagline: 'Get concise executive summaries in seconds',
    description: 'Powered by Gemini 3.8 Flash to distill lengthy reports, papers, and legal contracts.',
    iconName: 'Sparkles',
    badge: 'AI',
  },
  {
    id: 'ai-chat',
    name: 'Chat with PDF',
    category: 'ai',
    tagline: 'Converse directly with your documents',
    description: 'Ask questions, clarify complex clauses, and query data with context-grounded AI answers.',
    iconName: 'MessageSquare',
    badge: 'AI',
  },
  {
    id: 'ai-keypoints',
    name: 'Extract Key Points',
    category: 'ai',
    tagline: 'Instant bullet points, figures, and takeaways',
    description: 'Extract essential statistics, dates, deliverables, and conclusions from any document.',
    iconName: 'ListOrdered',
    badge: 'AI',
  },
  {
    id: 'ai-qa',
    name: 'AI-Powered PDF Q&A',
    category: 'ai',
    tagline: 'Generate study questions or answer complex inquiries',
    description: 'Deep question answering and automatic study assessment generation for documents.',
    iconName: 'HelpCircle',
    badge: 'AI',
  },
];
