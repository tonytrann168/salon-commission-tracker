/* Salon Besties service worker (story 018), generated at build time. Caches built static files only; never /api. */
const CACHE = 'salon-besties-__VERSION__';
const PRECACHE = __PRECACHE__;
// Scripts are requested with crossorigin (an Origin header); servers may answer "Vary: Origin". The cached copy is the
// same file, so ignore Vary when matching, or offline loads miss the cache.
const MATCH = { ignoreVary: true };

__RULES__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  // A new build: drop the old caches.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('salon-besties-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const keep = (request, response) => {
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const strategy = strategyFor(event.request.url, event.request.method, self.location.origin);
  if (strategy === 'skip') return;
  if (strategy === 'network-first') {
    event.respondWith(
      fetch(event.request)
        .then((response) => keep(event.request, response))
        .catch(() => caches.match(event.request, MATCH).then((hit) => hit || caches.match('/', MATCH))),
    );
    return;
  }
  event.respondWith(caches.match(event.request, MATCH).then((hit) => hit || fetch(event.request).then((response) => keep(event.request, response))));
});
