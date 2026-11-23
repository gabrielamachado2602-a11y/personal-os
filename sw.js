// Personal OS 2027 — Service Worker v3.26.0
const CACHE_NAME = 'personal-os-v3.26.0';
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// Instala e cacheia os assets principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        // Fontes podem falhar offline — ignora silenciosamente
        console.warn('[SW] Cache parcial:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Intercepta requisições — cache-first para o app, network-first para Drive API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Drive API e Google Auth — sempre vai para a rede (não cacheia dados pessoais)
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('google.com')) {
    return; // deixa o browser tratar normalmente
  }

  // Google Fonts — cache-first
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(event.request).then(cached => 
        cached || fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        }).catch(() => cached)
      )
    );
    return;
  }

  // App principal (index.html e assets) — cache-first, atualiza em background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
