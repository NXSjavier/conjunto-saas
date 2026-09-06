import { requestPushPermission, getExistingToken, onPushMessage, isPushSupported, isPushGranted } from './firebase';
import {
  isNative,
  requestNativeToken,
  registerNativeSilently,
  onNativePushEvents,
  checkNativePermissions,
} from './capacitorNotifications';
import { supabase } from './supabaseClient';
import { playNotificationBeep } from './sound';

let unregister: (() => void) | null = null;
let autoPromptDoneKey = 'push_auto_prompt_done_v1';
let autoPromptScheduled = false;

const deviceFlagKey = (authUserId: string) => `push_device_token_${authUserId}`;

export type PushStatus = 'unsupported' | 'denied' | 'needs-enable' | 'ready';

/**
 * Estado de push para ESTE dispositivo. En APK NUNCA usa localStorage
 * como fuente de verdad: siempre consulta el estado real de Android.
 */
export async function getPushStatus(authUserId?: string | null): Promise<PushStatus> {
  if (isNative()) {
    const status = await checkNativePermissions();
    if (status === 'denied') return 'denied';
    if (status === 'granted') {
      if (authUserId && !localStorage.getItem(deviceFlagKey(authUserId))) {
        // Permiso otorgado pero token sin registrar: aún necesita enable
        // (se intentará registrar en silencio en initPushNotifications)
        return 'needs-enable';
      }
      return 'ready';
    }
    return 'needs-enable';
  }
  if (!isPushSupported()) return 'unsupported';
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'needs-enable';
  if (authUserId && !localStorage.getItem(deviceFlagKey(authUserId))) return 'needs-enable';
  return 'ready';
}

function deviceLabel(): string {
  try {
    if (isNative()) return 'apk-android';
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
    const type = isStandalone ? 'pwa-instalada' : (isMobile ? 'movil' : 'pc');
    return `${type} ${platform}`.trim().slice(0, 80);
  } catch {
    return 'desconocido';
  }
}

async function saveDeviceToken(authUserId: string, token: string) {
  try {
    await supabase.from('push_tokens').upsert(
      { auth_user_id: authUserId, token, device_label: deviceLabel(), updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
  } catch (err) {
    console.error('saveDeviceToken push_tokens error:', err);
  }
  try {
    await supabase.from('profiles').update({ fcm_token: token }).eq('auth_user_id', authUserId);
  } catch {}
  try {
    localStorage.setItem(deviceFlagKey(authUserId), token);
  } catch {}
}

/**
 * Después del login: solo guarda el token si el permiso ya fue otorgado.
 * NO pide permiso web (en móvil requiere gesto del usuario).
 * En APK nativa registra en silencio SI el permiso ya está otorgado.
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
  try {
    if (isNative()) {
      startForegroundListener();
      const registered = await registerNativeSilently((token) => {
        saveDeviceToken(userId, token).catch(() => {});
      });
      // Programa auto-pedido de permiso tipo WhatsApp (3s después del login)
      scheduleAutoPrompt(userId);
      return registered;
    }

    if (!isPushSupported() || !isPushGranted()) return false;

    const token = await getExistingToken();
    if (!token) return false;

    await saveDeviceToken(userId, token);
    startForegroundListener();
    return true;
  } catch (err) {
    console.error('initPushNotifications error:', err);
    return false;
  }
}

/**
 * WhatsApp-style: pide permiso automáticamente unos segundos después
 * del login. No rompe el flujo; si se niega, el banner sigue ahí.
 * Solo se ejecuta UNA vez por sesión de login.
 */
function scheduleAutoPrompt(userId: string) {
  if (autoPromptScheduled) return;
  autoPromptScheduled = true;
  const runOnceFlag = `${autoPromptDoneKey}_${userId}`;
  try {
    if (sessionStorage.getItem(runOnceFlag)) return;
  } catch {}

  setTimeout(async () => {
    try {
      const st = await getPushStatus(userId);
      if (st !== 'needs-enable') return;

      if (isNative()) {
        const perm = await checkNativePermissions(true);
        if (perm === 'prompt') {
          const token = await requestNativeToken();
          if (token) await saveDeviceToken(userId, token);
        }
      } else if (isPushSupported() && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const token = await requestPushPermission();
        if (token) await saveDeviceToken(userId, token);
      }
    } catch (err) {
      console.error('autoPrompt error:', err);
    } finally {
      try { sessionStorage.setItem(runOnceFlag, '1'); } catch {}
    }
  }, 2800);
}

/**
 * Activar push desde gesto del usuario (tap en botón). SÍ pide permiso.
 */
export async function enablePushFromGesture(userId: string): Promise<boolean> {
  try {
    if (isNative()) {
      const token = await requestNativeToken();
      if (!token) return false;
      await saveDeviceToken(userId, token);
      startForegroundListener();
      return true;
    }

    const token = await requestPushPermission();
    if (!token) return false;

    await saveDeviceToken(userId, token);
    startForegroundListener();
    return true;
  } catch (err) {
    console.error('enablePushFromGesture error:', err);
    return false;
  }
}

function startForegroundListener() {
  if (isNative()) {
    onNativePushEvents(
      () => {
        try { playNotificationBeep(); } catch {}
      },
      (e) => {
        try {
          if (e.url && e.url !== '/') window.location.assign(e.url);
        } catch {}
      }
    );
    return;
  }
  if (unregister) unregister();
  unregister = onPushMessage(async (payload) => {
    const title = payload.notification?.title || 'Conjuntos App';
    const body = payload.notification?.body || '';
    const url = payload.data?.url || '/';

    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: payload.data?.tag || 'conjuntos-notification',
          data: { url },
        });
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192.svg' });
      }
    } catch {}
  }) || null;
}

export function cleanupPushNotifications() {
  if (unregister) {
    unregister();
    unregister = null;
  }
  autoPromptScheduled = false;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('push_device_token_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

async function collectTokensForProfiles(profileIds: string[]): Promise<string[]> {
  const tokens = new Set<string>();
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, auth_user_id, fcm_token')
      .in('id', profileIds);
    const list = profiles || [];
    list.forEach((p: any) => { if (p?.fcm_token) tokens.add(p.fcm_token); });
    const authIds = [...new Set(list.map((p: any) => p?.auth_user_id).filter(Boolean))];
    if (authIds.length > 0) {
      const { data: rows } = await supabase
        .from('push_tokens')
        .select('token')
        .in('auth_user_id', authIds);
      (rows || []).forEach((r: any) => { if (r?.token) tokens.add(r.token); });
    }
  } catch (err) {
    console.error('collectTokens error:', err);
  }
  return [...tokens];
}

/**
 * Enviar push notification a un usuario (TODOS sus dispositivos).
 */
export async function sendPushToUser(targetUserId: string, title: string, body: string, url?: string) {
  try {
    const tokens = await collectTokensForProfiles([targetUserId]);
    if (tokens.length === 0) return;

    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        notification: { title, body },
        data: { url: url || '/' },
      }),
    });
    if (!res.ok) console.error('send-push error:', await res.text());
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

/**
 * Enviar push a múltiples usuarios (TODOS sus dispositivos).
 */
export async function sendPushToMany(userIds: string[], title: string, body: string, url?: string) {
  try {
    if (userIds.length === 0) return;
    const tokens = await collectTokensForProfiles(userIds);
    if (tokens.length === 0) return;

    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        notification: { title, body },
        data: { url: url || '/' },
      }),
    });
    if (!res.ok) console.error('send-push error:', await res.text());
  } catch (err) {
    console.error('sendPushToMany error:', err);
  }
}
