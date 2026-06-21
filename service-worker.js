// ============================================================
// SERVICE WORKER — Calculadora Fotovoltaica
// Estrategia: Cache-first. Funciona 100% offline tras la
// primera carga.
// ============================================================

const CACHE_NAME = 'calc-fv-v8';

// Archivos que se cachean en la instalación
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── Instalación: pre-cachear todos los recursos ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: borrar caches viejos ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, red como fallback ────────────────────
self.addEventListener('fetch', event => {
  // Las peticiones a NASA POWER siempre van a la red (datos en tiempo real)
  if (event.request.url.includes('power.larc.nasa.gov')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'Sin conexión' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas del mismo origen
        if (
          response.ok &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() =>
      // Fallback offline: devolver el HTML principal
      caches.match('./index.html')
    )
  );
});
