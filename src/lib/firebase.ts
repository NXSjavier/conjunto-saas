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

let app: ReturnType<typeof initializeApp> | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

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
      messaging = getMessaging(fApp);
    }
  }
  return messaging;
}

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function isPushGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function isPushDefault(): boolean {
  return 'Notification' in window && Notification.permission === 'default';
}

export async function requestPushPermission(): Promise<string | null> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

    if (Notification.permission === 'granted') {
      // proceed
    } else if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return null;
    } else {
      return null;
    }

    const fcm = getFirebaseMessaging();
    if (!fcm) return null;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const token = await getToken(fcm, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (err) {
    console.error('requestPushPermission error:', err);
    return null;
  }
}

export async function getExistingToken(): Promise<string | null> {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;
    if (!('serviceWorker' in navigator)) return null;
    const fcm = getFirebaseMessaging();
    if (!fcm) return null;
    let reg: ServiceWorkerRegistration | undefined;
    try {
      reg = (await navigator.serviceWorker.getRegistration('/')) || undefined;
      if (!reg) {
        reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;
      reg = (await navigator.serviceWorker.getRegistration('/')) || reg;
    } catch {
      reg = undefined;
    }
    const token = await getToken(fcm, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: reg,
    });
    return token || null;
  } catch {
    return null;
  }
}

export function onPushMessage(callback: (payload: any) => void): (() => void) | null {
  const fcm = getFirebaseMessaging();
  if (!fcm) return null;
  return onMessage(fcm, callback);
}
