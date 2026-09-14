import { requestPushPermission, getExistingToken, onPushMessage, isPushSupported, isPushGranted } from './firebase';
import { supabase } from './supabaseClient';
import { playNotificationBeep, triggerHaptic } from './sound';

let unregister: (() => void) | null = null;
let autoPromptDoneKey = 'push_auto_prompt_done_v1';
let autoPromptScheduled = false;
let isInitialized = false;
let foregroundListenerStarted = false;

const deviceFlagKey = (authUserId: string) => `push_device_token_${authUserId}`;

export type PushStatus = 'unsupported' | 'denied' | 'needs-enable' | 'ready';

/**
 * Estado de push para ESTE dispositivo (solo PWA/Web).
 */
export async function getPushStatus(authUserId?: string | null): Promise<PushStatus> {
  if (!authUserId) return 'needs-enable';

  if (!isPushSupported()) return 'unsupported';
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'needs-enable';

  const savedToken = localStorage.getItem(deviceFlagKey(authUserId));
  if (!savedToken) return 'needs-enable';

  return 'ready';
}

function deviceLabel(): string {
  try {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
    const type = isStandalone ? 'pwa-instalada' : (isMobile ? 'movil' : 'pc');
    return `${type} ${platform}`.trim().slice(0, 80);
  } catch {
    return 'desconocido';
  }
}

async function saveDeviceToken(authUserId: string, token: string): Promise<boolean> {
  if (!authUserId || !token) return false;

  try {
    const { error: tokenError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          auth_user_id: authUserId,
          token,
          device_label: deviceLabel(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (tokenError) {
      console.error('Error saving token to push_tokens:', tokenError);
      return false;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('auth_user_id', authUserId);

    if (profileError) {
      console.warn('Error updating profile with token:', profileError);
    }

    try {
      localStorage.setItem(deviceFlagKey(authUserId), token);
    } catch (storageError) {
      console.warn('Error saving to localStorage:', storageError);
    }

    return true;
  } catch (err) {
    console.error('saveDeviceToken error:', err);
    return false;
  }
}

/**
 * Después del login: solo guarda el token si el permiso ya fue otorgado.
 * NO pide permiso (requiere gesto del usuario).
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('initPushNotifications: userId is required');
    return false;
  }

  if (isInitialized) return true;

  // Programar auto-prompt siempre (Android necesita pedir permiso aunque no esté granted)
  try { scheduleAutoPrompt(userId); } catch {}

  try {
    isInitialized = true;

    if (!isPushSupported() || !isPushGranted()) {
      isInitialized = false;
      return false;
    }

    const token = await getExistingToken();
    if (!token) {
      isInitialized = false;
      return false;
    }

    await saveDeviceToken(userId, token);

    if (!foregroundListenerStarted) {
      startForegroundListener();
      foregroundListenerStarted = true;
    }

    return true;
  } catch (err) {
    console.error('initPushNotifications error:', err);
    isInitialized = false;
    return false;
  }
}

/**
 * Pide permiso automáticamente unos segundos después del login.
 * Solo se ejecuta UNA vez por sesión de login.
 */
function scheduleAutoPrompt(userId: string) {
  if (!userId) return;
  if (autoPromptScheduled) return;

  autoPromptScheduled = true;
  const runOnceFlag = `${autoPromptDoneKey}_${userId}`;

  try {
    if (sessionStorage.getItem(runOnceFlag)) {
      autoPromptScheduled = false;
      return;
    }
  } catch {}

  setTimeout(async () => {
    try {
      const st = await getPushStatus(userId);
      if (st !== 'needs-enable') return;

      if (
        isPushSupported() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        const token = await requestPushPermission();
        if (token) {
          await saveDeviceToken(userId, token);
          console.log('Auto-prompt web: token obtained successfully');
        }
      }
    } catch (err) {
      console.error('autoPrompt error:', err);
    } finally {
      autoPromptScheduled = false;
      try {
        sessionStorage.setItem(runOnceFlag, '1');
      } catch {}
    }
  }, 2800);
}

/**
 * Activar push desde gesto del usuario (tap en botón). SÍ pide permiso.
 */
export async function enablePushFromGesture(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('enablePushFromGesture: userId is required');
    return false;
  }

  try {
    const token = await requestPushPermission();
    if (!token) return false;

    await saveDeviceToken(userId, token);

    if (!foregroundListenerStarted) {
      startForegroundListener();
      foregroundListenerStarted = true;
    }

    return true;
  } catch (err) {
    console.error('enablePushFromGesture error:', err);
    return false;
  }
}

function startForegroundListener() {
  if (foregroundListenerStarted) return;

  try {
    if (unregister) {
      unregister();
      unregister = null;
    }

    if (typeof onPushMessage === 'function') {
      unregister = onPushMessage(async (payload) => {
        try {
          const title = payload.notification?.title || 'Residex';
          const body = payload.notification?.body || '';
          const url = payload.data?.url || '/';

          // Sonido + vibración en foreground
          try { playNotificationBeep(); } catch {}
          try { triggerHaptic([200, 100, 200]); } catch {}

          const reg = await navigator.serviceWorker?.getRegistration();
          if (reg) {
            await reg.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: payload.data?.tag || 'conjuntos-notification',
              data: { url },
              silent: false,
              vibrate: [200, 100, 200],
            } as NotificationOptions);
          } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icons/icon-192.png' });
          }
        } catch (error) {
          console.warn('Error showing notification:', error);
        }
      }) || null;

      foregroundListenerStarted = true;
    } else {
      console.warn('onPushMessage is not available');
    }
  } catch (error) {
    console.error('Error starting foreground listener:', error);
  }
}

export function cleanupPushNotifications() {
  if (unregister) {
    try {
      unregister();
    } catch {}
    unregister = null;
  }

  autoPromptScheduled = false;
  isInitialized = false;
  foregroundListenerStarted = false;

  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('push_device_token_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

async function collectTokensForProfiles(profileIds: string[]): Promise<string[]> {
  if (!profileIds || profileIds.length === 0) return [];

  const tokens = new Set<string>();

  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, fcm_token')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    const list = profiles || [];

    list.forEach((p: any) => {
      if (p?.fcm_token && p.fcm_token.trim()) {
        tokens.add(p.fcm_token.trim());
      }
    });

    const authIds = [...new Set(list.map((p: any) => p?.auth_user_id).filter(Boolean))];

    if (authIds.length > 0) {
      const { data: rows, error: tokensError } = await supabase
        .from('push_tokens')
        .select('token')
        .in('auth_user_id', authIds);

      if (tokensError) {
        console.error('Error fetching push tokens:', tokensError);
      } else {
        (rows || []).forEach((r: any) => {
          if (r?.token && r.token.trim()) {
            tokens.add(r.token.trim());
          }
        });
      }
    }

    return [...tokens];
  } catch (err) {
    console.error('collectTokens error:', err);
    return [];
  }
}

export async function sendPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  if (!targetUserId || !title) {
    console.warn('sendPushToUser: targetUserId and title are required');
    return false;
  }

  try {
    const tokens = await collectTokensForProfiles([targetUserId]);
    if (tokens.length === 0) {
      console.warn(`No tokens found for user ${targetUserId}`);
      return false;
    }

    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        notification: { title, body },
        data: { url: url || '/' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('send-push error:', errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('sendPushToUser error:', err);
    return false;
  }
}

export async function sendPushToMany(
  userIds: string[],
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  if (!userIds || userIds.length === 0 || !title) {
    console.warn('sendPushToMany: userIds and title are required');
    return false;
  }

  try {
    const tokens = await collectTokensForProfiles(userIds);
    if (tokens.length === 0) {
      console.warn('No tokens found for users:', userIds);
      return false;
    }

    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        notification: { title, body },
        data: { url: url || '/' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('send-push error:', errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('sendPushToMany error:', err);
    return false;
  }
}

export async function getUserTokens(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    const tokens = await collectTokensForProfiles([userId]);
    return tokens;
  } catch (error) {
    console.error('getUserTokens error:', error);
    return [];
  }
}

export async function removeDeviceToken(userId: string, token?: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const tokenToRemove = token || localStorage.getItem(deviceFlagKey(userId));

    if (tokenToRemove) {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('token', tokenToRemove);

      if (error) {
        console.error('Error removing token:', error);
        return false;
      }

      try {
        localStorage.removeItem(deviceFlagKey(userId));
      } catch {}

      return true;
    }

    return false;
  } catch (error) {
    console.error('removeDeviceToken error:', error);
    return false;
  }
}

export async function getPushDebugInfo(authUserId: string) {
  const info: any = {
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'no-Notification',
    isSupported: isPushSupported(),
    isGranted: isPushGranted(),
    swActive: false,
    swScript: '',
    localToken: null as string | null,
    vapidConfigured: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration('/');
    info.swActive = !!(reg && reg.active);
    info.swScript = (reg?.active as any)?.scriptURL || reg?.waiting?.scriptURL || '';
  } catch {}
  try { info.localToken = localStorage.getItem(deviceFlagKey(authUserId)); } catch {}
  try {
    const { data } = await supabase.from('push_tokens').select('token').eq('auth_user_id', authUserId);
    info.serverTokensCount = (data || []).length;
  } catch { info.serverTokensCount = -1; }
  return info;
}
