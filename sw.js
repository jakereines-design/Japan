const CACHE = 'japan-trip-v4';
const TILE_CACHE = 'japan-tiles-v4';

const STATIC = [
  './',
  './index.html',
  './cheatsheet.html',
  './itinerary.html',
  './map.html',
  './phrases.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

// Install: pre-cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== TILE_CACHE)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Map tiles: cache-first (fast, works offline, tiles don't change)
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('arcgisonline.com')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Everything else: network-first, fall back to cache if offline
  e.respondWith(
    fetch(e.request).then(res => {
      // Save fresh copy to cache
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => {
      // Offline — serve from cache
      return caches.match(e.request);
    })
  );
});
