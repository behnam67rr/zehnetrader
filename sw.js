/* MindTrader service worker: background Web Push notifications */
const SW_VERSION = '2026-11-25-2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

async function broadcast(message) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach(client => { try { client.postMessage(message); } catch (_) {} });
}

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'ذهن تریدر', body: event.data ? event.data.text() : 'هشدار جدید' };
  }
  const category = String(data.category || 'general');
  const title = String(data.title || 'اعلان ذهن تریدر');
  const options = {
    body: String(data.body || ''),
    tag: String(data.tag || ('mindtrader-' + Date.now())),
    data: { url: String(data.url || './'), id: String(data.id || ''), category },
    icon: 'icon-192.png',
    dir: 'rtl',
    lang: 'fa',
    timestamp: Date.now(),
    vibrate: category === 'price_alert' ? [250, 100, 250, 100, 250] : [180, 80, 180],
    renotify: true
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    // Let any open window refresh its list / badge immediately.
    await broadcast({ type: 'push-received', category, id: options.data.id });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const info = event.notification.data || {};
  const scope = self.registration.scope;
  const target = new URL(info.url || './', scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const mine = windows.filter(c => c.url && c.url.startsWith(scope));
    const client = mine.find(c => c.focused) || mine[0];
    if (client) {
      // Do not navigate (that would reload the app and drop its state):
      // just focus it and ask it to open the notification center.
      try { await client.focus(); } catch (_) {}
      client.postMessage({ type: 'open-notifications', id: info.id || '' });
      return;
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(target + (target.includes('#') ? '' : '#notifications'));
    }
  })());
});

// The push service rotated / expired the subscription. We have no auth token
// here, so try to re-subscribe with the same options and ask open windows to
// re-register the new subscription on the server. If no window is open, the
// app re-syncs on next launch.
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription;
      if (old && old.options) await self.registration.pushManager.subscribe(old.options);
    } catch (_) {}
    await broadcast({ type: 'resubscribe' });
  })());
});
