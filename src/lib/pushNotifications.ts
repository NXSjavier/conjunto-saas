import { requestPushPermission, onPushMessage } from './firebase';
import { supabase } from './supabaseClient';

let unregister: (() => void) | null = null;

/**
 * Inicializar push notifications: pedir permiso y registrar token FCM.
 * Llamar después del login.
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
  try {
    const token = await requestPushPermission();
    if (!token) return false;

    // Guardar token en profiles.fcm_token
    await supabase.from('profiles').update({ fcm_token: token }).eq('auth_user_id', userId);

    // Escuchar mensajes foreground (cuando la app está abierta)
    if (unregister) unregister();
    unregister = onPushMessage((payload) => {
      const title = payload.notification?.title || 'Conjuntos App';
      const body = payload.notification?.body || '';
      const url = payload.data?.url || '/';

      // Mostrar notificación local即使 la app está abierta
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.svg',
          tag: payload.data?.tag || 'conjuntos-notification',
        });
      }
    }) || null;

    return true;
  } catch (err) {
    console.error('initPushNotifications error:', err);
    return false;
  }
}

/**
 * Limpiar listener al logout.
 */
export function cleanupPushNotifications() {
  if (unregister) {
    unregister();
    unregister = null;
  }
}

/**
 * Enviar push notification a un usuario específico (llamado desde Edge Functions o client).
 * Esta función es辅助 - el envío real se hace via Edge Function send-push.
 */
export async function sendPushToUser(targetUserId: string, title: string, body: string, url?: string) {
  try {
    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', targetUserId).single();
    if (!profile?.fcm_token) return;

    // Llamar Edge Function send-push
    await supabase.functions.invoke('send-push', {
      body: { token: profile.fcm_token, title, body, url: url || '/' },
    });
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

/**
 * Enviar push a múltiples usuarios.
 */
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
