/* OminiPDF Service Worker — Web Push Notifications & Click Routing */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function normalizePayload(rawData) {
  const fallback = {
    title: 'OminiPDF',
    body: 'New update from OminiPDF — your 100% free online PDF & Photo toolkit.',
    url: '/',
    icon: '/favicon-192x192.png',
    badge: '/favicon-96x96.png',
    tag: 'ominipdf-update',
  };

  if (!rawData) return fallback;

  try {
    const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    return {
      title: String(parsed.title || fallback.title).slice(0, 120),
      body: String(parsed.body || fallback.body).slice(0, 320),
      url: typeof parsed.url === 'string' && parsed.url.trim() ? parsed.url.trim() : '/',
      icon: parsed.icon || fallback.icon,
      badge: parsed.badge || fallback.badge,
      tag: parsed.tag || fallback.tag,
      image: typeof parsed.image === 'string' && parsed.image.trim() ? parsed.image.trim() : undefined,
    };
  } catch {
    const text = String(rawData).trim();
    return {
      ...fallback,
      body: text ? text.slice(0, 320) : fallback.body,
    };
  }
}

self.addEventListener('push', (event) => {
  let rawData = null;
  if (event.data) {
    try {
      rawData = event.data.json();
    } catch {
      rawData = event.data.text();
    }
  }

  const payload = normalizePayload(rawData);

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: true,
    vibrate: [120, 60, 120],
    data: {
      url: payload.url,
      receivedAt: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Open OminiPDF',
      },
    ],
  };

  if (payload.image) {
    options.image = payload.image;
  }

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const absoluteTarget = new URL(targetUrl, self.location.origin).href;

      for (const client of clientList) {
        if (client.url === absoluteTarget && 'focus' in client) {
          return client.focus();
        }
      }

      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            return client.navigate(absoluteTarget).then(() => client.focus());
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteTarget);
      }
      return undefined;
    })
  );
});
