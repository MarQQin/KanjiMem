const CACHE_NAME = 'kanji-memory-v1';
const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'data.js',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

/* ---- Install: precache all app shell ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate: purge old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: cache-first, network-fallback ---- */
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful same-origin responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback: return cached index.html for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('index.html');
      }
    })
  );
});
