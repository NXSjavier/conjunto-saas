/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.3.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.1/firebase-messaging-compat.js');

const VERSION = 'conjuntos-pwa-sw-v1';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbsZ6IFMNSeYLOng5acGr1FYKl_d3lXGA",
  authDomain: "conjuntos-app-8ae0e.firebaseapp.com",
  projectId: "conjuntos-app-8ae0e",
  storageBucket: "conjuntos-app-8ae0e.firebasestorage.app",
  messagingSenderId: "125997894850",
  appId: "1:125997894850:web:7235bfcd0d4c236c0aff5b"
};

const app = (typeof firebase !== 'undefined')
  ? (firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG))
  : null;

let messaging = null;
if (app && 'messaging' in firebase) {
  try { messaging = firebase.messaging(); } catch { messaging = null; }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().catch(() => {})
  );
});

function beepNotify() {
  try {
    registration.showNotification(' ', {
      body: ' ',
      icon: '/icons/icon-192.png',
      silent: true,
      tag: '_ping_beep_conjuntos_v1',
    }).then(() => {
      registration.getNotifications({ tag: '_ping_beep_conjuntos_v1' })
        .then((list) => { list.forEach((n) => n.close()); })
        .catch(() => {});
    }).catch(() => {});
  } catch {}
}

if (messaging && typeof messaging.onBackgroundMessage === 'function') {
  messaging.onBackgroundMessage((payload) => {
    const notification = payload?.notification || {};
    const data = payload?.data || {};
    const title = notification.title || data.title || data.notification_title || 'Conjuntos App';
    const body = notification.body || data.body || data.notification_body || 'Novedades en tu conjunto';
    const url = data.url || notification.click_action || '/';

    const options = {
      body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: notification.image || data.image || undefined,
      tag: data.tag || notification.tag || ('conjuntos_' + (data.id || Date.now())),
      renotify: true,
      requireInteraction: false,
      silent: !!notification.silent,
      vibrate: [200, 100, 200, 100, 200],
      data: { url, ...(data || {}) },
      timestamp: Date.now(),
    };

    return self.registration.showNotification(title, options).catch((err) => {
      console.warn('[FCM SW] showNotification failed:', err);
      beepNotify();
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const origin = self.location.origin;
      const target = new URL(url, origin).toString();

      for (const client of allClients) {
        if ('focus' in client) {
          const cur = new URL(client.url, origin).toString();
          if (cur === target) {
            try { return await client.focus(); } catch {}
          }
        }
      }

      if (allClients.length > 0 && 'focus' in allClients[0]) {
        try {
          const c = await allClients[0].focus();
          if (c && 'navigate' in c) { return await c.navigate(target); }
        } catch {}
      }

      if (self.clients.openWindow) {
        try { return await self.clients.openWindow(target); } catch {}
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  if (!event || !event.data) return;
  try {
    const payload = event.data.json();
    if (messaging && typeof messaging.onBackgroundMessage === 'function') {
      return;
    }
    const notification = payload?.notification || {};
    const data = payload?.data || {};
    const title = notification.title || data.title || data.notification_title || 'Conjuntos App';
    const body = notification.body || data.body || data.notification_body || '';
    if (!title && !body) return;
    const options = {
      body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: notification.image || data.image || undefined,
      tag: data.tag || notification.tag || ('conjuntos_' + Date.now()),
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || notification.click_action || '/', ...(data || {}) },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    try {
      const text = event.data.text();
      if (!text) return;
      event.waitUntil(self.registration.showNotification('Conjuntos App', {
        body: text,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      }));
    } catch {}
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); }
  if (data.type === 'PING_FCM') {
    beepNotify();
    try { event.source && event.source.postMessage({ type: 'PONG_FCM', v: VERSION }); } catch {}
  }
});
