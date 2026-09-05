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

export async function requestPushPermission(): Promise<string | null> {
  try {
    if (!('Notification' in window)) return null;
    if (Notification.permission === 'granted') {
      // Already granted
    } else if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return null;
    } else {
      return null; // denied
    }

    const fcm = getFirebaseMessaging();
    if (!fcm) return null;

    const sw = await navigator.serviceWorker?.register('/firebase-messaging-sw.js');
    if (sw) await navigator.serviceWorker?.ready;

    const token = await getToken(fcm, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: await navigator.serviceWorker?.getRegistration(),
    });

    return token || null;
  } catch (err) {
    console.error('requestPushPermission error:', err);
    return null;
  }
}

export function onPushMessage(callback: (payload: any) => void): (() => void) | null {
  const fcm = getFirebaseMessaging();
  if (!fcm) return null;
  return onMessage(fcm, callback);
}
