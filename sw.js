'use strict';
const CACHE_NAME = 'mindtrader-2.8.9-mt5-ui-refine';
const CACHE_PREFIX = 'zehn-trader-';
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
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
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
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
      const cachedPage = (await cache.match('./index.html')) || (await cache.match('./'));
      if (cachedPage) return cachedPage;
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put('./index.html', response.clone());
        return response;
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
