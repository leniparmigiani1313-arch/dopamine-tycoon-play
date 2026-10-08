/* Dopamine Tycoon : service worker de la version web (téléphone, navigateur).
 * Réseau d'abord, cache en secours : en ligne, on a toujours la dernière version publiée ;
 * hors ligne, le jeu s'ouvre quand même avec la dernière version vue. Le classement (ntfy.sh) n'est jamais mis en cache. */
const CACHE = 'dopamine-tycoon';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, {cache: 'no-cache'});
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, {ignoreSearch: true});
      if (hit) return hit;
      throw err;
    }
  })());
});
