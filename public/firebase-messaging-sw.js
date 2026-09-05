importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAExBjo6e0l5F_eqZMJKUePSV1Ze1Cif8Q",
  authDomain: "conjuntos-870fd.firebaseapp.com",
  projectId: "conjuntos-870fd",
  storageBucket: "conjuntos-870fd.firebasestorage.app",
  messagingSenderId: "777672530072",
  appId: "1:777672530072:web:1a0d61e148f01348f818ed",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Conjuntos App';
  const body = payload.notification?.body || payload.data?.body || 'Tienes una notificación nueva.';
  const url = payload.data?.url || '/';

  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url },
    tag: payload.data?.tag || 'conjuntos-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { notification: { title: 'Conjuntos App', body: event.data.text() } };
  }

  const title = payload.notification?.title || payload.data?.title || payload.title || 'Conjuntos App';
  const body = payload.notification?.body || payload.data?.body || payload.body || 'Tienes una notificación nueva.';
  const url = payload.data?.url || payload.url || '/';

  const options = {
    body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url },
    tag: payload.data?.tag || payload.tag || 'conjuntos-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// PWA Offline Caching
const CACHE_NAME = 'conjuntos-app-v4';
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/api/') || requestUrl.hostname.endsWith('supabase.co') || requestUrl.hostname.endsWith('googleapis.com')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/') || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});

