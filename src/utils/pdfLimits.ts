/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserPlanData {
  plan: 'free' | 'pro';
  pdfOperationsUsed: number;
  aiQueriesUsed: number;
  proExpiresAt?: string | null;
  subscriptionStatus?: 'active' | 'expired' | 'none';
}

export interface PlatformLimits {
  freePdfLimit: number;
  freeAiLimit: number;
  proPriceINR: number;
  subscriptionDays: number;
}

export const DEFAULT_LIMITS: PlatformLimits = {
  freePdfLimit: 3,
  freeAiLimit: 5,
  proPriceINR: 99,
  subscriptionDays: 30,
};

/**
 * Checks whether user's Pro subscription is currently active (within 30 days)
 */
export function isSubscriptionActive(
  user: UserPlanData,
  currentTimestamp: number = Date.now()
): boolean {
  if (user.plan !== 'pro') return false;
  // If user has an expiry date, verify timestamp has not elapsed
  if (user.proExpiresAt) {
    const expiryTime = new Date(user.proExpiresAt).getTime();
    if (isNaN(expiryTime) || expiryTime <= currentTimestamp) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates remaining days in a subscription
 */
export function getRemainingSubscriptionDays(
  proExpiresAt?: string | null,
  currentTimestamp: number = Date.now()
): number {
  if (!proExpiresAt) return 0;
  const expiryTime = new Date(proExpiresAt).getTime();
  if (isNaN(expiryTime) || expiryTime <= currentTimestamp) return 0;
  const msDiff = expiryTime - currentTimestamp;
  return Math.ceil(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Calculates new expiry timestamp given a start date and duration in days
 */
export function calculateSubscriptionExpiry(startDate = new Date(), days = 30): Date {
  const result = new Date(startDate.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Checks whether user has remaining PDF operation quota
 */
export function canPerformPdfOperation(
  user: UserPlanData,
  limits: PlatformLimits = DEFAULT_LIMITS,
  nowTimestamp: number = Date.now()
): { allowed: boolean; remaining: number; max: number } {
  if (user.plan === 'pro' && isSubscriptionActive(user, nowTimestamp)) {
    return { allowed: true, remaining: Infinity, max: Infinity };
  }
  const remaining = Math.max(0, limits.freePdfLimit - user.pdfOperationsUsed);
  return {
    allowed: remaining > 0,
    remaining,
    max: limits.freePdfLimit,
  };
}

/**
 * Checks whether user has remaining AI query quota
 */
export function canPerformAiQuery(
  user: UserPlanData,
  limits: PlatformLimits = DEFAULT_LIMITS,
  nowTimestamp: number = Date.now()
): { allowed: boolean; remaining: number; max: number } {
  if (user.plan === 'pro' && isSubscriptionActive(user, nowTimestamp)) {
    return { allowed: true, remaining: Infinity, max: Infinity };
  }
  const remaining = Math.max(0, limits.freeAiLimit - user.aiQueriesUsed);
  return {
    allowed: remaining > 0,
    remaining,
    max: limits.freeAiLimit,
  };
}

/**
 * Calculates compression savings ratio and percentage
 */
export function calculateSavings(
  originalSize: number,
  compressedSize: number
): { savedBytes: number; percent: number } {
  if (originalSize <= 0) return { savedBytes: 0, percent: 0 };
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const percent = Math.min(100, Math.round((savedBytes / originalSize) * 100));
  return { savedBytes, percent };
}

/**
 * Parses page range syntax like "1-3, 5, 7-8" into 1-based unique sorted page numbers
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr?.trim(), 10);
      const end = parseInt(endStr?.trim(), 10);

      if (!isNaN(start) && !isNaN(end)) {
        const lower = Math.max(1, Math.min(start, end));
        const upper = Math.min(totalPages, Math.max(start, end));
        for (let i = lower; i <= upper; i++) {
          pages.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Formats file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats Indian Rupee currency amount
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Extracts and sanitizes ZapPay Order ID from raw text, URLs, or query parameters
 */
export function extractZapOrderId(input?: string): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // 1. URL queries like ?order_id=ZP... or &order=ZP...
  const urlParamMatch = trimmed.match(/[?&](?:order_id|order)=([A-Za-z0-9_-]+)/i);
  if (urlParamMatch && urlParamMatch[1]) {
    return urlParamMatch[1].toUpperCase();
  }

  // 2. Direct string starting with ZP
  const directZp = trimmed.match(/\b(ZP[a-zA-Z0-9]+)\b/i);
  if (directZp && directZp[1]) {
    return directZp[1].toUpperCase();
  }

  // 3. Clean alphanumeric token (between 8 and 35 chars)
  const cleanToken = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (cleanToken.length >= 8 && cleanToken.length <= 35) {
    return cleanToken.toUpperCase();
  }

  return null;
}

/**
 * Computes discounted price from base price and voucher discount percentage
 */
export function computeVoucherDiscount(
  basePrice: number,
  discountPercent: number
): { finalPrice: number; discountAmount: number; isFree: boolean } {
  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  const discountAmount = Math.round((basePrice * safeDiscount) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);
  return {
    finalPrice,
    discountAmount,
    isFree: finalPrice === 0,
  };
}

