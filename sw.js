const CACHE_NAME = 'brandscent-co-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation/API-ish calls, falling back to cache when offline.
// Cache-first for everything else (fonts, icons, the app shell).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // don't intercept Google Sheet sync POSTs

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Don't try to cache cross-origin (fonts CDN, Google Sheets) opaque responses issues; best effort only.
        try {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        } catch (e) {}
        return res;
      }).catch(() => cached);
    })
  );
});
