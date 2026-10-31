/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro';
  pdfOperationsUsed: number;
  aiQueriesUsed: number;
  subscriptionDurationDays?: number; // 30
  proSubscribedAt?: string;
  proExpiresAt?: string | null; // ISO string 30 days ahead
  subscriptionStatus?: 'active' | 'expired' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentHistoryRecord {
  id: string;
  userId: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  resultSummary: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface TransactionRecord {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  plan: 'pro';
  durationDays: number;
  paymentId: string;
  paymentMethod: string;
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface VoucherRecord {
  id: string;
  code: string;
  discountPercent: number; // e.g. 100 for free, 50 for 50%
  maxUses: number;
  currentUses: number;
  active: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  freePdfLimit: number;
  freeAiLimit: number;
  proPriceINR: number;
  subscriptionDays: number;
  geminiModel: string;
  aiApiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  maintenanceMode: boolean;
  zapPayLinkId: string;
  announcementText?: string;
  announcementActive?: boolean;
}

export interface DatabaseSchema {
  users: UserRecord[];
  documents: DocumentHistoryRecord[];
  transactions: TransactionRecord[];
  settings: PlatformSettings;
  vouchers: VoucherRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'codegarage1@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const INITIAL_SETTINGS: PlatformSettings = {
  freePdfLimit: 3,
  freeAiLimit: 5,
  proPriceINR: 99,
  subscriptionDays: 30,
  geminiModel: 'gpt-4o-mini',
  aiApiBaseUrl: 'https://freemodel.in/v1',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  maintenanceMode: false,
  zapPayLinkId: 'f66a2d52',
  announcementText: '⚡ Special Offer: Unlock 30 Days of Unlimited AI PDF Tools for just ₹99 via ZapPay UPI!',
  announcementActive: true,
};

const INITIAL_VOUCHERS: VoucherRecord[] = [
  {
    id: 'vouch_omini99',
    code: 'OMINI99',
    discountPercent: 100,
    maxUses: 1000,
    currentUses: 3,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vouch_propass50',
    code: 'PROPASS50',
    discountPercent: 50,
    maxUses: 500,
    currentUses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
  const userHash = bcrypt.hashSync('user123', salt);

  const now = new Date();
  const nowIso = now.toISOString();
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
  // Admin 30-day subscription active
  const adminExpiryIso = new Date(Date.now() + 30 * 86400000).toISOString();

  const adminUser: UserRecord = {
    id: 'user_admin_01',
    name: 'Code Garage Admin',
    email: ADMIN_EMAIL,
    passwordHash: adminHash,
    role: 'admin',
    plan: 'pro',
    subscriptionDurationDays: 30,
    proSubscribedAt: yesterdayIso,
    proExpiresAt: adminExpiryIso,
    subscriptionStatus: 'active',
    pdfOperationsUsed: 14,
    aiQueriesUsed: 32,
    createdAt: yesterdayIso,
    updatedAt: nowIso,
  };

  const demoUser: UserRecord = {
    id: 'user_demo_02',
    name: 'Alex Rivera',
    email: 'user@example.com',
    passwordHash: userHash,
    role: 'user',
    plan: 'free',
    subscriptionStatus: 'none',
    pdfOperationsUsed: 1,
    aiQueriesUsed: 2,
    createdAt: yesterdayIso,
    updatedAt: nowIso,
  };

  const initialDocs: DocumentHistoryRecord[] = [
    {
      id: 'doc_init_01',
      userId: 'user_demo_02',
      toolName: 'Merge PDF',
      fileName: 'Project_Proposal_Q4.pdf',
      fileSize: 1420000,
      resultSummary: 'Merged 3 documents (12 pages total)',
      timestamp: yesterdayIso,
      status: 'success',
    },
    {
      id: 'doc_init_02',
      userId: 'user_demo_02',
      toolName: 'AI PDF Summarizer',
      fileName: 'Financial_Report_2026.pdf',
      fileSize: 850000,
      resultSummary: 'Executive Brief generated (5 key takeaways)',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'success',
    },
    {
      id: 'doc_init_03',
      userId: 'user_admin_01',
      toolName: 'Protect PDF',
      fileName: 'Board_Confidential.pdf',
      fileSize: 2200000,
      resultSummary: 'Encrypted with 256-bit AES & master password',
      timestamp: yesterdayIso,
      status: 'success',
    },
  ];

  const initialTransactions: TransactionRecord[] = [
    {
      id: 'tx_seed_01',
      userId: 'user_admin_01',
      userEmail: ADMIN_EMAIL,
      amount: 99,
      currency: 'INR',
      plan: 'pro',
      durationDays: 30,
      paymentId: 'PAY_PRO_30D_SEED',
      paymentMethod: 'UPI (admin@okhdfc)',
      status: 'completed',
      createdAt: yesterdayIso,
    },
  ];

  return {
    users: [adminUser, demoUser],
    documents: initialDocs,
    transactions: initialTransactions,
    settings: INITIAL_SETTINGS,
    vouchers: INITIAL_VOUCHERS,
  };
}

class JsonDatabase {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.settings = { ...INITIAL_SETTINGS, ...(this.data.settings || {}) };
        if (!this.data.users) this.data.users = [];
        if (!this.data.documents) this.data.documents = [];
        if (!this.data.transactions) this.data.transactions = [];
        if (!this.data.vouchers) this.data.vouchers = INITIAL_VOUCHERS;
        if (!this.data.settings.zapPayLinkId) this.data.settings.zapPayLinkId = 'f66a2d52';

        // Ensure admin user exists with codegarage1@gmail.com
        this.ensureAdminUser();
        this.save();
      } catch {
        this.data = getInitialData();
        this.save();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  private ensureAdminUser() {
    const existing = this.data.users.find(
      (u) => u.email.toLowerCase() === ADMIN_EMAIL
    );
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
      const adminExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
      const newAdmin: UserRecord = {
        id: `user_admin_${Date.now()}`,
        name: 'Code Garage Admin',
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        role: 'admin',
        plan: 'pro',
        subscriptionDurationDays: 30,
        proSubscribedAt: new Date().toISOString(),
        proExpiresAt: adminExpiry,
        subscriptionStatus: 'active',
        pdfOperationsUsed: 0,
        aiQueriesUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.unshift(newAdmin);
      this.save();
    } else {
      // Ensure role is admin
      let modified = false;
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        modified = true;
      }
      if (existing.plan !== 'pro') {
        existing.plan = 'pro';
        modified = true;
      }
      if (modified) {
        this.save();
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  /**
   * Evaluates user's subscription and auto-downgrades if 30 days have expired
   */
  public syncSubscription(user: UserRecord): UserRecord {
    if (user.role === 'admin') {
      // Keep admin as pro
      return user;
    }

    if (user.plan === 'pro' && user.proExpiresAt) {
      const expiry = new Date(user.proExpiresAt).getTime();
      if (!isNaN(expiry) && expiry <= Date.now()) {
        // Expired! Downgrade to Free
        user.plan = 'free';
        user.subscriptionStatus = 'expired';
        user.updatedAt = new Date().toISOString();
        this.save();
      }
    }
    return user;
  }

  // User operations
  getUsers(): UserRecord[] {
    return this.data.users.map((u) => this.syncSubscription(u));
  }

  getUserById(id: string): UserRecord | undefined {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return undefined;
    return this.syncSubscription(user);
  }

  getUserByEmail(email: string): UserRecord | undefined {
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return undefined;
    return this.syncSubscription(user);
  }

  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): UserRecord {
    const now = new Date().toISOString();
    const newUser: UserRecord = {
      ...user,
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const userIndex = this.data.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return undefined;

    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.users[userIndex];
  }

  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Document History
  getAllDocuments(): DocumentHistoryRecord[] {
    return this.data.documents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getUserDocuments(userId: string): DocumentHistoryRecord[] {
    return this.data.documents
      .filter((d) => d.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addDocumentHistory(doc: Omit<DocumentHistoryRecord, 'id' | 'timestamp'>): DocumentHistoryRecord {
    const record: DocumentHistoryRecord = {
      ...doc,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.documents.unshift(record);
    this.save();
    return record;
  }

  // Transactions
  getTransactions(): TransactionRecord[] {
    return this.data.transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getUserTransactions(userId: string): TransactionRecord[] {
    return this.data.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addTransaction(tx: Omit<TransactionRecord, 'id' | 'createdAt'>): TransactionRecord {
    const record: TransactionRecord = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(record);
    this.save();
    return record;
  }

  updateTransaction(id: string, updates: Partial<TransactionRecord>): TransactionRecord | undefined {
    const txIndex = this.data.transactions.findIndex((t) => t.id === id || t.paymentId === id);
    if (txIndex === -1) return undefined;

    this.data.transactions[txIndex] = {
      ...this.data.transactions[txIndex],
      ...updates,
    };
    this.save();
    return this.data.transactions[txIndex];
  }

  // Vouchers
  getVouchers(): VoucherRecord[] {
    return this.data.vouchers || [];
  }

  addVoucher(voucher: Omit<VoucherRecord, 'id' | 'createdAt'>): VoucherRecord {
    if (!this.data.vouchers) this.data.vouchers = [];
    const newVoucher: VoucherRecord = {
      ...voucher,
      id: `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.vouchers.unshift(newVoucher);
    this.save();
    return newVoucher;
  }

  updateVoucher(id: string, updates: Partial<VoucherRecord>): VoucherRecord | undefined {
    if (!this.data.vouchers) return undefined;
    const idx = this.data.vouchers.findIndex((v) => v.id === id || v.code.toUpperCase() === id.toUpperCase());
    if (idx === -1) return undefined;

    this.data.vouchers[idx] = {
      ...this.data.vouchers[idx],
      ...updates,
    };
    this.save();
    return this.data.vouchers[idx];
  }

  deleteVoucher(id: string): boolean {
    if (!this.data.vouchers) return false;
    const initialLen = this.data.vouchers.length;
    this.data.vouchers = this.data.vouchers.filter((v) => v.id !== id && v.code.toUpperCase() !== id.toUpperCase());
    if (this.data.vouchers.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Platform Settings
  getSettings(): PlatformSettings {
    return this.data.settings;
  }

  updateSettings(newSettings: Partial<PlatformSettings>): PlatformSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }
}

export const db = new JsonDatabase();

export function sanitizeUser(user: UserRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}
