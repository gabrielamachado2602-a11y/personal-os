// Personal OS 2027 — Service Worker v3.39.0
// Estratégia: REDE PRIMEIRO para o app (sempre pega a versão mais nova quando há internet),
// cache só como reserva quando estiver offline.
const CACHE_NAME = 'personal-os-v3.39.0';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache parcial:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // APIs do Google (Drive, login) — nunca cacheia, nunca intercepta
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('google.com') || url.hostname.endsWith('gstatic.com')) return;

  // Fontes — cache primeiro (não mudam)
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }))
    );
    return;
  }

  // App (index.html, sw.js etc.) — rede primeiro, cache se offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
  }
});
