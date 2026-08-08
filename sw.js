const CACHE_NAME = "kanji-memory-v6";
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "data.js",
  "manifest.json",
  "icons/icon-192.svg",
  "icons/icon-192.png",
  "icons/icon-180.png",
  "icons/icon-512.svg",
  "icons/icon-512.png"
];

/* ---- Install: precache, skip waiting ---- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate: purge old caches, reload clients ---- */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
    .then(() =>
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.navigate(c.url))
      )
    )
  );
});

/* ---- Fetch: cache-first (fast, no extra traffic) ---- */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});