import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export interface NativePushEvent {
  kind: 'received' | 'tap';
  title: string;
  body: string;
  url: string;
}

let listenersAttached = false;
let tapHandler: ((e: NativePushEvent) => void) | null = null;
let receiveHandler: ((e: NativePushEvent) => void) | null = null;

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function payloadOf(notification: any): { title: string; body: string; url: string } {
  const data = notification?.data || {};
  return {
    title: notification?.title || data.title || 'Conjuntos App',
    body: notification?.body || notification?.description || data.body || '',
    url: data.url || '/',
  };
}

function attachListeners() {
  if (listenersAttached || !isNative()) return;
  listenersAttached = true;

  PushNotifications.addListener('registrationError', (err) => {
    console.error('native push registration error:', err);
  }).catch(() => {});

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const p = payloadOf(notification);
    receiveHandler?.({ kind: 'received', ...p });
  }).catch(() => {});

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const p = payloadOf(action?.notification);
    tapHandler?.({ kind: 'tap', ...p });
  }).catch(() => {});
}

export function onNativePushEvents(onReceive: (e: NativePushEvent) => void, onTap: (e: NativePushEvent) => void) {
  attachListeners();
  receiveHandler = onReceive;
  tapHandler = onTap;
}

/**
 * Pide permiso del sistema (llamar desde gesto del usuario) y devuelve el
 * token FCM nativo. Null si se niega o falla.
 */
export async function requestNativeToken(timeoutMs = 20000): Promise<string | null> {
  if (!isNative()) return null;
  attachListeners();
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;

    const token = await new Promise<string | null>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, timeoutMs);
      PushNotifications.addListener('registration', (t) => {
        if (!done) { done = true; clearTimeout(timer); resolve(t.value || null); }
      }).catch(() => {
        if (!done) { done = true; clearTimeout(timer); resolve(null); }
      });
      PushNotifications.register().catch(() => {
        if (!done) { done = true; clearTimeout(timer); resolve(null); }
      });
    });
    return token;
  } catch (err) {
    console.error('requestNativeToken error:', err);
    return null;
  }
}

/**
 * Intento silencioso (login): registra y guarda el token cuando llegue,
 * sin mostrar dialogo de permiso.
 */
export function registerNativeSilently(onToken: (token: string) => void) {
  if (!isNative()) return;
  attachListeners();
  PushNotifications.addListener('registration', (t) => {
    if (t?.value) onToken(t.value);
  }).catch(() => {});
  PushNotifications.register().catch(() => {});
}
