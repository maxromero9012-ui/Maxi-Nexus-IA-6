// sw.js - Service Worker para Maxi IA

const CACHE_NAME = 'maxi-ia-v1';
const urlsToCache = [
  './',                // Página principal (start_url)
  './index.html',      // El HTML principal (puede ser el mismo que './')
  './manifest.json',   // Manifiesto de la PWA
  './icon.png'         // Icono de la app (asegúrate de que exista)
];

// Instalación: guarda los recursos estáticos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: limpia cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch: estrategia "cache first" para recursos estáticos,
// y "network only" para las APIs externas.
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // No cachear las peticiones a las APIs de pollinations.ai
  if (url.hostname === 'text.pollinations.ai' || url.hostname === 'image.pollinations.ai') {
    event.respondWith(fetch(request));
    return;
  }

  // Para el resto, intentar caché primero, luego red
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Devuelve el recurso desde caché
          return response;
        }
        // Si no está en caché, ve a la red
        return fetch(request).then(
          networkResponse => {
            // Opcional: guardar en caché las nuevas respuestas
            // Solo para recursos del mismo origen
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          }
        ).catch(() => {
          // Fallback en caso de error de red y sin caché
          // Puedes mostrar una página offline si la tienes
          return new Response('No hay conexión a Internet', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
