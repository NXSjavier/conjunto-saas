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
  const title = payload.notification?.title || 'Conjuntos App';
  const body = payload.notification?.body || 'Tienes una notificación nueva.';
  const url = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url },
    tag: payload.data?.tag || 'conjuntos-notification',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
