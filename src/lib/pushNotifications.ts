import { requestPushPermission, getExistingToken, onPushMessage, isPushSupported, isPushGranted } from './firebase';
import { supabase } from './supabaseClient';

let unregister: (() => void) | null = null;

/**
 * After login: only save token if permission already granted.
 * Does NOT prompt user (needs user gesture on mobile).
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!isPushSupported() || !isPushGranted()) return false;

    const token = await getExistingToken();
    if (!token) return false;

    await supabase.from('profiles').update({ fcm_token: token }).eq('auth_user_id', userId);

    startForegroundListener();
    return true;
  } catch (err) {
    console.error('initPushNotifications error:', err);
    return false;
  }
}

/**
 * Enable push from user gesture (button tap).
 * This WILL prompt for permission.
 */
export async function enablePushFromGesture(userId: string): Promise<boolean> {
  try {
    const token = await requestPushPermission();
    if (!token) return false;

    await supabase.from('profiles').update({ fcm_token: token }).eq('auth_user_id', userId);

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
}

export async function sendPushToUser(targetUserId: string, title: string, body: string, url?: string) {
  try {
    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', targetUserId).single();
    if (!profile?.fcm_token) return;
    await supabase.functions.invoke('send-push', {
      body: { token: profile.fcm_token, title, body, url: url || '/' },
    });
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

export async function sendPushToMany(userIds: string[], title: string, body: string, url?: string) {
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, fcm_token').in('id', userIds);
    const tokens = (profiles || []).map((p) => p.fcm_token).filter(Boolean);
    if (tokens.length === 0) return;
    await supabase.functions.invoke('send-push', {
      body: { tokens, title, body, url: url || '/' },
    });
  } catch (err) {
    console.error('sendPushToMany error:', err);
  }
}
