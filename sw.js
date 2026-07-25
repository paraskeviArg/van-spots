// Simple offline cache for map tiles.
// Any tile that loads successfully while online is cached
// and served from cache thereafter, including when offline.

const CACHE_NAME = 'van-spots-tiles-v1';
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'services.terrascope.be',
  'wmts.terrascope.be',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isTile = TILE_HOSTS.some(h => url.hostname.includes(h));
  if (!isTile) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) {
          // Serve from cache; refresh in background
          fetch(event.request).then((fresh) => {
            if (fresh && fresh.status === 200) cache.put(event.request, fresh.clone());
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // Offline and not cached — return a transparent 1x1 png so map doesn't error
          return new Response(
            Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII='), c => c.charCodeAt(0)),
            { headers: { 'Content-Type': 'image/png' } }
          );
        });
      })
    )
  );
});
