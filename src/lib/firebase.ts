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
    let reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (!reg || !reg.active) {
      reg = await navigator.serviceWorker.register(SW_SCRIPT, { scope: SW_SCOPE, updateViaCache: 'none' });
      try { reg.update(); } catch {}
    }
    try {
      await navigator.serviceWorker.ready;
    } catch {}
    reg = (await navigator.serviceWorker.getRegistration(SW_SCOPE)) || reg;
    // Forzar claim: si hay un SW nuevo en waiting, lo activamos.
    if (reg && reg.waiting) {
      try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
    }
    return reg || null;
  } catch (err) {
    console.warn('ensureServiceWorker error:', err);
    return null;
  }
}

/**
 * Pide permiso y obtiene token FCM (solo para PWA/web, NO Capacitor).
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
    return token || null;
  } catch (err) {
    console.error('requestPushPermission error:', err);
    return null;
  }
}

/**
 * Si el permiso ya fue otorgado, devuelve el token existente o genera uno nuevo.
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
 * Listener para notificaciones en PRIMER PLANO (app abierta).
 */
export function onPushMessage(callback: (payload: any) => void): (() => void) | null {
  const fcm = getFirebaseMessaging();
  if (!fcm) return null;
  try {
    return onMessage(fcm, callback);
  } catch {
    return null;
  }
}
