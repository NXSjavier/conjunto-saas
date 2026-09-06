import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export type NativePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface NativePushEvent {
  kind: 'received' | 'tap';
  title: string;
  body: string;
  url: string;
}

let listenersAttached = false;
let tapHandler: ((e: NativePushEvent) => void) | null = null;
let receiveHandler: ((e: NativePushEvent) => void) | null = null;
let pendingTapEvent: NativePushEvent | null = null;
let initialCheckDone = false;
let cachedPermissionStatus: NativePermissionStatus | null = null;

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function payloadOf(notification: any): { title: string; body: string; url: string } {
  const data = notification?.data || {};
  const extra = notification || {};
  return {
    title: extra.title || data.title || data.notification_title || 'Conjuntos App',
    body: extra.body || extra.description || data.body || data.notification_body || '',
    url: data.url || data.click_action || '/',
  };
}

function dispatchPendingTap() {
  if (pendingTapEvent && tapHandler) {
    const ev = pendingTapEvent;
    pendingTapEvent = null;
    try { tapHandler(ev); } catch {}
  }
}

async function checkLaunchNotification() {
  if (initialCheckDone || !isNative()) return;
  initialCheckDone = true;
  try {
    const res = await PushNotifications.getDeliveredNotifications();
    const notifications = res?.notifications || [];
    if (notifications.length > 0) {
      const last = notifications[notifications.length - 1];
      pendingTapEvent = { kind: 'tap', ...payloadOf(last) };
      dispatchPendingTap();
    }
  } catch {}
}

function attachListeners() {
  if (listenersAttached || !isNative()) return;
  listenersAttached = true;

  PushNotifications.addListener('registrationError', (err) => {
    console.error('native push registration error:', err);
  }).catch(() => {});

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const p = payloadOf(notification);
    try { receiveHandler?.({ kind: 'received', ...p }); } catch {}
  }).catch(() => {});

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const p = payloadOf(action?.notification);
    const ev: NativePushEvent = { kind: 'tap', ...p };
    if (tapHandler) {
      try { tapHandler(ev); } catch {}
    } else {
      pendingTapEvent = ev;
    }
  }).catch(() => {});

  setTimeout(() => checkLaunchNotification(), 800);
}

/**
 * Consulta el estado REAL del permiso de notificaciones en Android,
 * sin depender de localStorage. Cachea el resultado durante la sesión.
 */
export async function checkNativePermissions(forceRefresh = false): Promise<NativePermissionStatus> {
  if (!isNative()) return 'unsupported';
  if (cachedPermissionStatus && !forceRefresh) return cachedPermissionStatus;
  try {
    attachListeners();
    const res = await PushNotifications.checkPermissions();
    const r = res?.receive || 'prompt';
    let status: NativePermissionStatus;
    if (r === 'granted') status = 'granted';
    else if (r === 'denied') status = 'denied';
    else status = 'prompt';
    cachedPermissionStatus = status;
    return status;
  } catch (err) {
    console.error('checkNativePermissions error:', err);
    cachedPermissionStatus = 'prompt';
    return 'prompt';
  }
}

export function resetNativePermissionCache() {
  cachedPermissionStatus = null;
}

export function onNativePushEvents(onReceive: (e: NativePushEvent) => void, onTap: (e: NativePushEvent) => void) {
  attachListeners();
  receiveHandler = onReceive;
  tapHandler = onTap;
  dispatchPendingTap();
}

/**
 * Pide permiso del sistema Android (abre diálogo nativo tipo WhatsApp)
 * y devuelve el token FCM nativo. Null si se niega o falla.
 */
export async function requestNativeToken(timeoutMs = 25000): Promise<string | null> {
  if (!isNative()) return null;
  attachListeners();
  try {
    resetNativePermissionCache();
    const perm = await PushNotifications.requestPermissions();
    cachedPermissionStatus = perm.receive === 'granted' ? 'granted' : perm.receive === 'denied' ? 'denied' : 'prompt';
    if (perm.receive !== 'granted') return null;

    const token = await new Promise<string | null>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, timeoutMs);
      const regHandler = PushNotifications.addListener('registration', (t) => {
        if (!done) { done = true; clearTimeout(timer); resolve(t.value || null); }
      });
      regHandler.catch(() => {
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
 * Intento silencioso (login): SI Y SOLO SI el permiso ya fue otorgado,
 * registra y guarda el token. Sin mostrar diálogo.
 */
export async function registerNativeSilently(onToken: (token: string) => void): Promise<boolean> {
  if (!isNative()) return false;
  attachListeners();
  try {
    const status = await checkNativePermissions(true);
    if (status !== 'granted') {
      // Permiso no otorgado: NO llamamos a register, no pedimos nada.
      return false;
    }
    PushNotifications.addListener('registration', (t) => {
      if (t?.value) onToken(t.value);
    }).catch(() => {});
    await PushNotifications.register();
    return true;
  } catch (err) {
    console.error('registerNativeSilently error:', err);
    return false;
  }
}
