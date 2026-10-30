// Offline support: cache pages and assets so the tools work without a network.
// Photos are never cached; they never touch the network at all.
const CACHE = 'exifshield-v2';
// Works at a domain root or a sub-path (e.g. GitHub Pages project sites).
const BASE = new URL('./', self.location).pathname;
const PRECACHE = ['', 'exif-viewer/', 'remove-exif/', 'photo-privacy-checker/', 'photo-location-finder/', 'remove-gps-from-photo/', 'batch-exif-viewer/', 'exif-to-csv/', 'favicon.svg'].map((p) => BASE + p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith(BASE + '_astro/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })),
    );
    return;
  }
  // Pages and other files: network-first, fall back to cache when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match(BASE))),
  );
});
