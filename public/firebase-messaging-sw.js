/* eslint-disable no-undef */

// ✅ CAMBIAR A VERSIÓN 10.7.1 (más estable que 12.3.1)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const VERSION = 'conjuntos-pwa-sw-v5';

// ✅ CONFIGURACIÓN DE FIREBASE
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbsZ6IFMNSeYLOng5acGr1FYKl_d3lXGA",
  authDomain: "conjuntos-app-8ae0e.firebaseapp.com",
  projectId: "conjuntos-app-8ae0e",
  storageBucket: "conjuntos-app-8ae0e.firebasestorage.app",
  messagingSenderId: "125997894850",
  appId: "1:125997894850:web:7235bfcd0d4c236c0aff5b"
};

// ✅ Inicializar Firebase
let app = null;
let messaging = null;

try {
  if (typeof firebase !== 'undefined') {
    if (firebase.apps.length) {
      app = firebase.app();
    } else {
      app = firebase.initializeApp(FIREBASE_CONFIG);
    }
    
    if (app && typeof firebase.messaging === 'function') {
      try {
        messaging = firebase.messaging();
        console.log('[SW] Firebase Messaging inicializado');
      } catch (e) {
        console.warn('[SW] Error inicializando messaging:', e);
        messaging = null;
      }
    }
  }
} catch (error) {
  console.error('[SW] Error inicializando Firebase:', error);
}

// ✅ KEEP-ALIVE para Android
let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return Promise.resolve();
  console.log('[SW] Iniciando keep-alive para Android');
  keepAliveInterval = setInterval(() => {
    try {
      self.clients.matchAll().then(() => {});
    } catch {}
  }, 25000);
  return Promise.resolve();
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('[SW] Deteniendo keep-alive');
  }
}

// ✅ INSTALACIÓN
const CACHE_NAME = 'conjuntos-cache-v1';
const ASSETS_CACHE_NAME = 'conjuntos-assets-v1';
const OFFLINE_FALLBACK_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      self.registration.update().catch(() => {}),
      caches.open(ASSETS_CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {}),
    ])
  );
});

// ✅ ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.startsWith('conjuntos-')) {
              console.log('🧹 Eliminando cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// ✅ FETCH: cache-first para estáticos, network-first para API, fallback offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET
  if (request.method !== 'GET') return;

  // Navegación / rutas SPA → network falling back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_FALLBACK_URL))
    );
    return;
  }

  // API calls → network first, cache fallback
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/rest/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images) → cache first, network fallback
  const isStaticAsset = /\.(js|css|woff2?|woff|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp|woff2)$/i.test(url.pathname)
    || url.pathname.includes('/assets/')
    || url.origin === self.location.origin;

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResp) => {
          if (networkResp && networkResp.status === 200 && networkResp.type !== 'opaque') {
            const respClone = networkResp.clone();
            caches.open(ASSETS_CACHE_NAME).then((cache) => cache.put(request, respClone)).catch(() => {});
          }
          return networkResp;
        }).catch(() => caches.match(OFFLINE_FALLBACK_URL));
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ✅ FUNCIÓN PARA MOSTRAR NOTIFICACIÓN
function showNotification(title, body, payload) {
  try {
    const url = payload?.data?.url || '/';
    const icon = payload?.notification?.icon || '/icons/icon-192.png';
    const image = payload?.notification?.image || null;
    const tag = payload?.data?.tag || 'conjuntos-notification';

    const options = {
      body: body || 'Novedades en tu conjunto',
      icon: icon,
      badge: '/icons/icon-192.png',
      tag: tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: url,
        payload: payload,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: '📱 Abrir App'
        }
      ]
    };

    if (image) {
      options.image = image;
    }

    console.log('[SW] Mostrando notificación:', { title, body, url });
    return self.registration.showNotification(title, options);
  } catch (error) {
    console.error('[SW] Error mostrando notificación:', error);
    return Promise.reject(error);
  }
}

// ✅ NOTIFICACIONES EN SEGUNDO PLANO
if (messaging && typeof messaging.onBackgroundMessage === 'function') {
  messaging.onBackgroundMessage((payload) => {
    console.log('📨 [SW] Mensaje en background:', payload);
    
    const title = payload?.notification?.title || 
                  payload?.data?.title || 
                  payload?.data?.notification_title || 
                  'Residex';
    
    const body = payload?.notification?.body || 
                 payload?.data?.body || 
                 payload?.data?.notification_body || 
                 'Novedades en tu conjunto';

    return showNotification(title, body, payload);
  });
}

// ✅ EVENTO PUSH (fallback + principal para web push)
// Con app cerrada Chrome dispara 'push' con payload FCM. No hacemos early return si messaging existe:
// onBackgroundMessage ya manejó el caso FCM SDK, pero este listener cubre webpush directo.
self.addEventListener('push', (event) => {
  console.log('📨 [SW] Evento push recibido');
  
  if (!event || !event.data) return;

  try {
    const payload = event.data.json();
    console.log('[SW] Payload push:', payload);
    // Si el SDK de Firebase ya va a mostrar notificación via onBackgroundMessage, igual mostramos
    // para garantizar entrega cuando el payload viene como webpush.notification
    const title = payload?.notification?.title || payload?.data?.title || 'Residex';
    const body = payload?.notification?.body || payload?.data?.body || 'Novedades en tu conjunto';
    
    if (!title && !body) return;

    event.waitUntil(showNotification(title, body, payload));
  } catch (error) {
    console.error('[SW] Error procesando push:', error);
    try {
      const text = event.data.text();
      if (text) {
        event.waitUntil(
          self.registration.showNotification('Residex', {
            body: text,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            silent: false,
            vibrate: [200, 100, 200],
          })
        );
      }
    } catch {}
  }
});

// ✅ CLICK EN NOTIFICACIÓN
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Click en notificación:', event);
  
  const notification = event.notification;
  const action = event.action || 'open';
  
  if (action === 'dismiss' || action === 'close') {
    notification.close();
    return;
  }

  notification.close();

  const url = notification.data?.url || '/';
  const payload = notification.data?.payload || {};

  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        for (const client of allClients) {
          try {
            await client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: payload,
              url: url,
              action: action
            });
            if ('navigate' in client) {
              await client.navigate(url);
            }
            return;
          } catch (error) {
            console.warn('[SW] Error con cliente:', error);
          }
        }

        if (self.clients.openWindow) {
          const newClient = await self.clients.openWindow(url);
          if (newClient) {
            newClient.postMessage({
              type: 'NOTIFICATION_CLICK',
              payload: payload,
              url: url,
              action: action
            });
          }
        }
      } catch (error) {
        console.error('[SW] Error abriendo ventana:', error);
        try {
          await self.clients.openWindow('/');
        } catch {}
      }
    })()
  );
});

// ✅ MENSAJES DESDE LA VENTANA
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Mensaje recibido:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'START_KEEP_ALIVE') {
    startKeepAlive();
  }
  
  if (event.data?.type === 'STOP_KEEP_ALIVE') {
    stopKeepAlive();
  }
  
  if (event.data?.type === 'PING_FCM') {
    try {
      event.source?.postMessage({
        type: 'PONG_FCM',
        v: VERSION
      });
    } catch {}
  }
});

console.log(`✅ Service Worker Residex v${VERSION} cargado`);