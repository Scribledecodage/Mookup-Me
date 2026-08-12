const CACHE_NAME = 'mookup-v2';

// Fichiers à mettre en cache immédiatement pour permettre un premier fallback hors ligne.
const ASSETS_TO_CACHE = [
  '/',
  '/Logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => (
          cacheName !== CACHE_NAME ? caches.delete(cacheName) : undefined
        ))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function offlineResponse() {
  return new Response('Mookup est momentanément hors ligne.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Le Service Worker ne doit jamais intercepter les écritures ou les flux temps réel.
  if (request.method !== 'GET') return;

  // Laisser les navigations HTML à Vercel/Next.js : une réponse 503 fabriquée
  // par le Service Worker masque la vraie réponse réseau et bloque Electron.
  if (request.mode === 'navigate') return;

  // Ne jamais intercepter les requêtes Next.js/HMR/webpack.
  if (
    url.includes('/_next/') ||
    url.includes('webpack') ||
    url.includes('hot-update')
  ) return;

  // Ne jamais intercepter le manifeste de version : il doit toujours être relu.
  if (url.includes('version.json')) return;

  // Ne jamais intercepter Firebase, Firestore, Google APIs ou Supabase.
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('google.com/identitytoolkit') ||
    url.includes('securetoken.google.com') ||
    url.includes('supabase.co') ||
    url.includes('supabase.io') ||
    url.includes('identitytoolkit') ||
    url.includes('fcm.googleapis.com')
  ) return;

  // En développement local, on n'intercepte rien.
  const isLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('192.168.') ||
    url.includes('10.') ||
    url.includes('172.');

  if (isLocal) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).catch(() => offlineResponse());
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'reply' && event.reply) {
    const replyText = event.reply;

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'REPLY_NOTIFICATION',
            text: replyText,
            groupId: event.notification.data ? event.notification.data.groupId : 'general'
          });
          return clientList[0].focus();
        }
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) return clientList[0].focus();
        return self.clients.openWindow('/');
      })
    );
  }
});
