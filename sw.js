const CACHE_NAME = 'registro-comportamental-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // Si tu archivo se llama distinto, cámbialo:
  // './tu-archivo.html',

  // Librerías externas que usas (para que carguen incluso con mala red)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// INSTALACIÓN: cachear el “app shell”
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN: limpiar versiones viejas de caché
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ESTRATEGIA DE RESPUESTA: cache first para navegación básica
self.addEventListener('fetch', event => {
  const request = event.request;

  // Solo manejamos peticiones GET
  if (request.method !== 'GET') return;

  // Para páginas / app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Si hay red, devolvemos y actualizamos caché
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Si no hay red, respondemos desde caché
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Para otros recursos (css, js, cdn, etc.): cache first, luego red
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(request)
        .then(networkResponse => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() => {
          // Si no está en caché y no hay red, no podemos hacer mucho
          return new Response('Offline y recurso no cacheado.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});
