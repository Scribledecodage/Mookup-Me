const CACHE_NAME = 'mookup-v1';

// Fichiers à mettre en cache immédiatement (Optionnel pour l'installation mais bien pour le offline)
const ASSETS_TO_CACHE = [
  '/',
  '/Logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ne jamais intercepter les requêtes Next.js/HMR/webpack
  if (
    url.includes('/_next/') ||
    url.includes('webpack') ||
    url.includes('hot-update')
  ) {
    return;
  }

  // Ne jamais intercepter version.json
  if (url.includes('version.json')) {
    return;
  }

  // Ne jamais intercepter Firebase, Firestore, Google APIs, Supabase
  // Ces services ont besoin de connexions directes (streaming long-poll, WebSocket, etc.)
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
  ) {
    return;
  }

  // En développement local, on n'intercepte rien
  const isLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('192.168.') ||
    url.includes('10.') ||
    url.includes('172.');

  if (isLocal) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'reply' && event.reply) {
    // Si c'est une réponse directe depuis la notification
    const replyText = event.reply;
    
    // On envoie le message au client (l'application)
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
    // Clic normal sur la notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});
