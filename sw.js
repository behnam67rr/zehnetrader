'use strict';
const CACHE_NAME = 'mindtrader-3.0.2-web-push';
const CACHE_PREFIX = 'mindtrader-';
const LEGACY_PREFIXES = ['zehn-trader-'];
const OPTIONAL_ASSETS = ['./lightweight-charts.standalone.production.js'];
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL);
      // Optional local chart library: cache it if present, never fail the install if it is missing.
      await Promise.all(OPTIONAL_ASSETS.map(url => fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)));
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => (key.startsWith(CACHE_PREFIX) || LEGACY_PREFIXES.some(p => key.startsWith(p))) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === 'navigate') {
      // Stale-while-revalidate: open instantly from cache, refresh the cached page in the background.
      const cachedPage = (await cache.match('./index.html')) || (await cache.match('./'));
      const refresh = fetch(request).then(async response => {
        if (response && response.ok) await cache.put('./index.html', response.clone());
        return response;
      });
      if (cachedPage) { event.waitUntil(refresh.catch(() => null)); return cachedPage; }
      try {
        return await refresh;
      } catch (error) {
        return new Response('نسخه آفلاین در دسترس نیست. یک‌بار با اینترنت برنامه را باز کن.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});


// Background Web Push: works when the PWA window is closed, subject to browser/OS
// notification permission and push-service delivery.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { title: 'MindTrader', body: event.data ? event.data.text() : 'اعلان جدید' }; }
  const title = String(data.title || 'MindTrader');
  const options = {
    body: String(data.body || 'رویداد جدید معاملاتی'),
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: String(data.tag || ('mindtrader-' + Date.now())),
    renotify: true,
    requireInteraction: false,
    vibrate: [180, 80, 180],
    data: { url: String(data.url || './') }
  };
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = windows.find(client => client.visibilityState === 'visible');
    if (visible) {
      visible.postMessage({ type: 'MINDTRADER_PUSH_RECEIVED', payload: data });
      return;
    }
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
