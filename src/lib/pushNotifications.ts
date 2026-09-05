import { requestPushPermission, getExistingToken, onPushMessage, isPushSupported, isPushGranted } from './firebase';
import { supabase } from './supabaseClient';

let unregister: (() => void) | null = null;

const deviceFlagKey = (authUserId: string) => `push_device_token_${authUserId}`;

export type PushStatus = 'unsupported' | 'denied' | 'needs-enable' | 'ready';

/**
 * Estado de push para ESTE dispositivo (no global del usuario).
 */
export function getPushStatus(authUserId?: string | null): PushStatus {
  if (!isPushSupported()) return 'unsupported';
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'needs-enable';
  if (authUserId && !localStorage.getItem(deviceFlagKey(authUserId))) return 'needs-enable';
  return 'ready';
}

function deviceLabel(): string {
  try {
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
  // Token multi-dispositivo (tabla push_tokens) + legacy (profiles.fcm_token)
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
 * NO pide permiso (en móvil requiere gesto del usuario).
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
  try {
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
 * Activar push desde gesto del usuario (tap en botón). SÍ pide permiso.
 */
export async function enablePushFromGesture(userId: string): Promise<boolean> {
  try {
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
    // Legacy: fcm_token directo en profiles
    list.forEach((p: any) => { if (p?.fcm_token) tokens.add(p.fcm_token); });
    // Multi-dispositivo: tabla push_tokens
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

    await supabase.functions.invoke('send-push', {
      body: { tokens, title, body, url: url || '/' },
    });
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

    await supabase.functions.invoke('send-push', {
      body: { tokens, title, body, url: url || '/' },
    });
  } catch (err) {
    console.error('sendPushToMany error:', err);
  }
}
