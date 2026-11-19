/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type * as WebPushModule from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushModule;

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushBroadcastRecord {
  id: string;
  title: string;
  body: string;
  url: string;
  sentCount: number;
  failedCount: number;
  removedExpiredCount: number;
  sentAt: string;
}

interface PushVapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIG_FILE = path.resolve(DATA_DIR, 'push-config.json');
const SUBS_FILE = path.resolve(DATA_DIR, 'push-subscriptions.json');
const HISTORY_FILE = path.resolve(DATA_DIR, 'push-history.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

class PushNotificationService {
  private vapid: PushVapidConfig;
  private subscriptions: StoredPushSubscription[] = [];
  private history: PushBroadcastRecord[] = [];

  constructor() {
    ensureDataDir();
    this.vapid = this.loadOrCreateVapidKeys();
    webpush.setVapidDetails(this.vapid.subject, this.vapid.publicKey, this.vapid.privateKey);
    this.subscriptions = this.readJson<StoredPushSubscription[]>(SUBS_FILE, []);
    this.history = this.readJson<PushBroadcastRecord[]>(HISTORY_FILE, []);
  }

  private readJson<T>(filePath: string, fallback: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed as T;
      }
    } catch (err) {
      console.warn(`Push store read notice (${path.basename(filePath)}):`, err);
    }
    return fallback;
  }

  private writeJson(filePath: string, data: unknown): void {
    try {
      ensureDataDir();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Push store write error (${path.basename(filePath)}):`, err);
    }
  }

  private loadOrCreateVapidKeys(): PushVapidConfig {
    const envPublic = (process.env.VAPID_PUBLIC_KEY || '').trim();
    const envPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim();
    const envSubject = (process.env.VAPID_SUBJECT || 'mailto:support@ominipdf.com').trim();

    if (envPublic && envPrivate) {
      return {
        publicKey: envPublic,
        privateKey: envPrivate,
        subject: envSubject,
      };
    }

    const saved = this.readJson<PushVapidConfig | null>(CONFIG_FILE, null);
    if (saved && saved.publicKey && saved.privateKey) {
      return {
        publicKey: saved.publicKey,
        privateKey: saved.privateKey,
        subject: saved.subject || envSubject,
      };
    }

    const generated = webpush.generateVAPIDKeys();
    const config: PushVapidConfig = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject: envSubject,
    };
    this.writeJson(CONFIG_FILE, config);
    return config;
  }

  getPublicKey(): string {
    return this.vapid.publicKey;
  }

  upsertSubscription(
    rawSub: {
      endpoint?: string;
      expirationTime?: number | null;
      keys?: { p256dh?: string; auth?: string };
    },
    userAgent?: string
  ): StoredPushSubscription {
    const endpoint = String(rawSub?.endpoint || '').trim();
    const p256dh = String(rawSub?.keys?.p256dh || '').trim();
    const auth = String(rawSub?.keys?.auth || '').trim();

    if (!endpoint || !/^https:\/\//i.test(endpoint)) {
      throw new Error('Invalid push subscription endpoint.');
    }
    if (!p256dh || !auth) {
      throw new Error('Push subscription encryption keys are missing.');
    }

    const now = new Date().toISOString();
    const existingIdx = this.subscriptions.findIndex((s) => s.endpoint === endpoint);

    if (existingIdx >= 0) {
      this.subscriptions[existingIdx] = {
        ...this.subscriptions[existingIdx],
        expirationTime: rawSub.expirationTime ?? null,
        keys: { p256dh, auth },
        userAgent: userAgent ? String(userAgent).slice(0, 240) : this.subscriptions[existingIdx].userAgent,
        updatedAt: now,
      };
      this.writeJson(SUBS_FILE, this.subscriptions);
      return this.subscriptions[existingIdx];
    }

    const record: StoredPushSubscription = {
      endpoint,
      expirationTime: rawSub.expirationTime ?? null,
      keys: { p256dh, auth },
      userAgent: userAgent ? String(userAgent).slice(0, 240) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.unshift(record);
    this.writeJson(SUBS_FILE, this.subscriptions);
    return record;
  }

  removeSubscription(endpoint: string): boolean {
    const clean = String(endpoint || '').trim();
    if (!clean) return false;
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter((s) => s.endpoint !== clean);
    if (this.subscriptions.length !== before) {
      this.writeJson(SUBS_FILE, this.subscriptions);
      return true;
    }
    return false;
  }

  getStats() {
    return {
      subscriberCount: this.subscriptions.length,
      recentBroadcasts: this.history.slice(0, 15),
    };
  }

  async sendToEndpoint(
    endpoint: string,
    payload: { title: string; body: string; url?: string; tag?: string }
  ): Promise<{ delivered: boolean; removed?: boolean; error?: string }> {
    const sub = this.subscriptions.find((s) => s.endpoint === endpoint);
    if (!sub) {
      return { delivered: false, error: 'Subscription not found.' };
    }

    const message = JSON.stringify({
      title: String(payload.title || 'OminiPDF').slice(0, 120),
      body: String(payload.body || 'Notifications are active on OminiPDF!').slice(0, 320),
      url: payload.url || '/',
      tag: payload.tag || 'ominipdf-test',
      icon: '/favicon-192x192.png',
      badge: '/favicon-96x96.png',
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ?? null,
          keys: sub.keys,
        },
        message,
        { TTL: 3600 }
      );
      return { delivered: true };
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        this.removeSubscription(sub.endpoint);
        return { delivered: false, removed: true, error: 'Subscription expired and removed.' };
      }
      return { delivered: false, error: err?.message || 'Push delivery failed.' };
    }
  }

  async broadcast(payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }): Promise<PushBroadcastRecord> {
    const cleanTitle = String(payload.title || '').trim().slice(0, 120) || 'OminiPDF Update';
    const cleanBody =
      String(payload.body || '').trim().slice(0, 320) ||
      'New update available on OminiPDF — 100% Free PDF & Photo Suite.';
    const rawUrl = String(payload.url || '/').trim();
    const cleanUrl = rawUrl.startsWith('/') || /^https?:\/\//i.test(rawUrl) ? rawUrl : '/';

    const message = JSON.stringify({
      title: cleanTitle,
      body: cleanBody,
      url: cleanUrl,
      tag: payload.tag || `ominipdf-broadcast-${Date.now()}`,
      icon: '/favicon-192x192.png',
      badge: '/favicon-96x96.png',
    });

    let sentCount = 0;
    let failedCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      this.subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              expirationTime: sub.expirationTime ?? null,
              keys: sub.keys,
            },
            message,
            { TTL: 86400 }
          );
          sentCount += 1;
        } catch (err: any) {
          failedCount += 1;
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    if (expiredEndpoints.length > 0) {
      const expiredSet = new Set(expiredEndpoints);
      this.subscriptions = this.subscriptions.filter((s) => !expiredSet.has(s.endpoint));
      this.writeJson(SUBS_FILE, this.subscriptions);
    }

    const record: PushBroadcastRecord = {
      id: `push_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      body: cleanBody,
      url: cleanUrl,
      sentCount,
      failedCount,
      removedExpiredCount: expiredEndpoints.length,
      sentAt: new Date().toISOString(),
    };

    this.history.unshift(record);
    this.history = this.history.slice(0, 25);
    this.writeJson(HISTORY_FILE, this.history);
    return record;
  }
}

export const pushService = new PushNotificationService();
