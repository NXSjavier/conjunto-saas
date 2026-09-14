import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const SW_SCRIPT = '/firebase-messaging-sw.js';
const SW_SCOPE = '/';

let app: ReturnType<typeof initializeApp> | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;
let messageListener: (() => void) | null = null;

export const __internal = { SW_SCRIPT, SW_SCOPE };

function getFirebaseApp() {
  if (!app && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getFirebaseMessaging() {
  if (!messaging && firebaseConfig.apiKey) {
    const fApp = getFirebaseApp();
    if (fApp) {
      try {
        messaging = getMessaging(fApp);
      } catch {
        messaging = null;
      }
    }
  }
  return messaging;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

export function isPushGranted(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

export function isPushDefault(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default';
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // pwa.js es el único que registra/limpia SW. Aquí solo reutilizamos el registro.
    let reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (!reg) {
      // Fallback si pwa.js aún no registró (ej. primer load muy temprano)
      try {
        reg = await navigator.serviceWorker.register(SW_SCRIPT, { scope: SW_SCOPE, updateViaCache: 'none' });
      } catch {}
    }
    if (reg?.waiting) {
      try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
    }
    await navigator.serviceWorker.ready;
    return reg || (await navigator.serviceWorker.getRegistration(SW_SCOPE));
  } catch (err) {
    console.error('❌ Error en ensureServiceWorker:', err);
    return null;
  }
}

/**
 * Pide permiso y obtiene token FCM
 */
export async function requestPushPermission(): Promise<string | null> {
  try {
    if (!isPushSupported()) return null;

    if (Notification.permission === 'denied') return null;

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return null;
    }

    const fcm = getFirebaseMessaging();
    if (!fcm) return null;

    const reg = await ensureServiceWorker();
    if (!reg) return null;

    const token = await getToken(fcm, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: reg,
    });
    
    console.log('✅ Token FCM obtenido:', token);
    return token || null;
  } catch (err) {
    console.error('requestPushPermission error:', err);
    return null;
  }
}

/**
 * Obtiene el token existente
 */
export async function getExistingToken(): Promise<string | null> {
  try {
    if (!isPushSupported() || !isPushGranted()) return null;
    const fcm = getFirebaseMessaging();
    if (!fcm) return null;

    const reg = await ensureServiceWorker();
    if (!reg) return null;

    const token = await getToken(fcm, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: reg,
    });
    return token || null;
  } catch (err) {
    console.error('getExistingToken error:', err);
    return null;
  }
}

/**
 * Escucha notificaciones en PRIMER PLANO (app abierta)
 */
export function onPushMessage(callback: (payload: any) => void): (() => void) | null {
  const fcm = getFirebaseMessaging();
  if (!fcm) {
    console.warn('⚠️ Firebase Messaging no inicializado');
    return null;
  }
  
  try {
    // ✅ Limpiar listener anterior
    if (messageListener) {
      messageListener();
      messageListener = null;
    }

    // ✅ Escuchar mensajes en primer plano
    messageListener = onMessage(fcm, (payload) => {
      console.log('📨 [Foreground] Mensaje recibido:', payload);
      
      // ✅ Mostrar notificación nativa en foreground
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const title = payload.notification?.title || 'Residex';
        const body = payload.notification?.body || '';
        const icon = payload.notification?.icon || '/icons/icon-192.png';
        const url = payload.data?.url || '/';
        
        try {
          const notification = new Notification(title, {
            body: body,
            icon: icon,
            data: {
              url: url,
              payload: payload
            },
            vibrate: [200, 100, 200, 100, 200],
          });
          
          notification.onclick = () => {
            notification.close();
            if (url && url !== '/') {
              window.location.href = url;
            }
          };
        } catch (error) {
          console.warn('Error mostrando notificación nativa:', error);
        }
      }
      
      // ✅ Ejecutar callback con el payload
      if (callback) {
        callback(payload);
      }
    });

    console.log('✅ Listener de mensajes en foreground activado');
    return () => {
      if (messageListener) {
        messageListener();
        messageListener = null;
      }
    };
  } catch (error) {
    console.error('❌ Error en onPushMessage:', error);
    return null;
  }
}

/**
 * Limpia los listeners de Firebase
 */
export function cleanupFirebaseListeners() {
  if (messageListener) {
    try {
      messageListener();
    } catch {}
    messageListener = null;
    console.log('🧹 Listeners de Firebase limpiados');
  }
}