/* MindTrader service worker: background Web Push notifications */
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'ذهن تریدر', body: event.data ? event.data.text() : 'هشدار جدید' };
  }
  const title = String(data.title || 'اعلان ذهن تریدر');
  const options = {
    body: String(data.body || ''),
    tag: String(data.tag || ('mindtrader-' + Date.now())),
    data: { url: String(data.url || './') },
    vibrate: [180, 80, 180],
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
