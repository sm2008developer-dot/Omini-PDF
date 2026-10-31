/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro';
  pdfOperationsUsed: number;
  aiQueriesUsed: number;
  subscriptionDurationDays?: number;
  proSubscribedAt?: string;
  proExpiresAt?: string | null;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentHistory {
  id: string;
  userId: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  resultSummary: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  plan: 'pro';
  durationDays?: number;
  paymentId: string;
  paymentMethod: string;
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface PlatformLimits {
  freePdfLimit: number;
  freeAiLimit: number;
  proPriceINR: number;
  subscriptionDays: number;
  zapPayLinkId?: string;
  announcementText?: string;
  announcementActive?: boolean;
  maintenanceMode?: boolean;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('omini_auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('omini_auth_token', token);
    } else {
      localStorage.removeItem('omini_auth_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      const errorObj = new Error(errorMsg) as Error & { status?: number; limitReached?: boolean };
      errorObj.status = response.status;
      errorObj.limitReached = data.limitReached;
      throw errorObj;
    }

    return data as T;
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<{ user: User; limits: PlatformLimits }> {
    return this.request<{ user: User; limits: PlatformLimits }>('/api/auth/me');
  }

  async getPublicSettings(): Promise<PlatformLimits> {
    return this.request<PlatformLimits>('/api/platform/public-settings');
  }

  logout() {
    this.setToken(null);
  }

  // Profile & History
  async updateProfile(name: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async getHistory(): Promise<{ history: DocumentHistory[] }> {
    return this.request<{ history: DocumentHistory[] }>('/api/user/history');
  }

  async resetDemoUsage(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/user/reset-demo', {
      method: 'POST',
    });
  }

  // PDF Operation Tracking
  async logPdfOperation(payload: {
    toolName: string;
    fileName: string;
    fileSize: number;
    resultSummary: string;
  }): Promise<{ success: boolean; user: User; historyRecord: DocumentHistory }> {
    return this.request<{ success: boolean; user: User; historyRecord: DocumentHistory }>(
      '/api/pdf/log-operation',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  // Payment
  async createPaymentOrder(voucherCode?: string): Promise<{
    orderId: string;
    zapOrderId?: string;
    paymentUrl?: string;
    amount: number;
    currency: string;
    planName: string;
    user: { id: string; name: string; email: string };
  }> {
    return this.request('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ voucherCode }),
    });
  }

  async validateVoucher(code: string): Promise<{
    valid: boolean;
    code: string;
    discountPercent: number;
    originalPrice: number;
    finalPrice: number;
    isFree: boolean;
    message?: string;
  }> {
    return this.request('/api/payment/validate-voucher', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async checkPaymentStatus(orderId: string): Promise<{
    success: boolean;
    status: 'success' | 'pending' | 'failed' | 'timeout' | 'not_found';
    orderId: string;
    message?: string;
  }> {
    return this.request(`/api/payment/check-status/${encodeURIComponent(orderId)}`);
  }

  async verifyPayment(payload: {
    orderId?: string;
    zapOrderId?: string;
    paymentMethod?: string;
    promoCode?: string;
    utrNumber?: string;
    zapPayTransactionId?: string;
  }): Promise<{ success: boolean; message: string; user: User; transaction: Transaction }> {
    return this.request('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // AI Operations
  async aiSummarize(payload: {
    text: string;
    fileName: string;
    summaryType: string;
  }): Promise<{ summary: string; user: User }> {
    return this.request('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiChat(payload: {
    text: string;
    query: string;
    fileName: string;
    chatHistory?: { role: string; content: string }[];
  }): Promise<{ answer: string; user: User }> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiExtractKeypoints(payload: {
    text: string;
    fileName: string;
  }): Promise<{ keypoints: string; user: User }> {
    return this.request('/api/ai/extract-keypoints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiQA(payload: {
    text: string;
    fileName: string;
    question?: string;
  }): Promise<{ result: string; user: User }> {
    return this.request('/api/ai/qa', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin
  async adminGetStats(): Promise<{
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    totalRevenue: number;
    totalPdfOps: number;
    totalAiQueries: number;
    transactionsCount: number;
    recentTransactions: Transaction[];
  }> {
    return this.request('/api/admin/stats');
  }

  async adminGetUsers(): Promise<{ users: User[] }> {
    return this.request('/api/admin/users');
  }

  async adminUpdateUser(
    id: string,
    updates: { plan?: 'free' | 'pro'; role?: 'admin' | 'user'; pdfOperationsUsed?: number; aiQueriesUsed?: number }
  ): Promise<{ user: User }> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async adminGetSettings(): Promise<{
    settings: {
      freePdfLimit: number;
      freeAiLimit: number;
      proPriceINR: number;
      subscriptionDays: number;
      geminiModel: string;
      maintenanceMode: boolean;
      zapPayLinkId: string;
      announcementText?: string;
      announcementActive?: boolean;
    };
  }> {
    return this.request('/api/admin/settings');
  }

  async adminUpdateSettings(settings: Record<string, unknown>): Promise<{ settings: Record<string, unknown> }> {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async adminDeleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async adminGrantPro(
    userOrPayload: string | { userId?: string; email?: string; days?: number },
    days = 30
  ): Promise<{ success: boolean; user: User }> {
    const body =
      typeof userOrPayload === 'string'
        ? { userId: userOrPayload, days }
        : { ...userOrPayload, days: userOrPayload.days || days };
    return this.request('/api/admin/grant-pro', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async adminGetDocuments(): Promise<{ documents: DocumentHistory[] }> {
    return this.request('/api/admin/documents');
  }

  async adminUpdateTransaction(
    id: string,
    updates: { status?: 'completed' | 'failed'; paymentMethod?: string }
  ): Promise<{ transaction: Transaction }> {
    return this.request(`/api/admin/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async adminGetVouchers(): Promise<{
    vouchers: Array<{
      id: string;
      code: string;
      discountPercent: number;
      maxUses: number;
      currentUses: number;
      active: boolean;
      createdAt: string;
    }>;
  }> {
    return this.request('/api/admin/vouchers');
  }

  async adminCreateVoucher(payload: {
    code: string;
    discountPercent: number;
    maxUses: number;
    active: boolean;
  }): Promise<{ voucher: any }> {
    return this.request('/api/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async adminUpdateVoucher(id: string, updates: any): Promise<{ voucher: any }> {
    return this.request(`/api/admin/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async adminDeleteVoucher(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/admin/vouchers/${id}`, {
      method: 'DELETE',
    });
  }

  async adminGetAiModels(): Promise<{
    models: Array<{ id: string; name: string; provider: string }>;
    activeModel: string;
    isLive: boolean;
  }> {
    return this.request('/api/admin/ai-models');
  }

  async adminTestAi(payload: {
    apiKey?: string;
    apiBaseUrl?: string;
    model?: string;
  }): Promise<{ success: boolean; message: string; reply?: string; error?: string }> {
    return this.request('/api/admin/ai-test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
