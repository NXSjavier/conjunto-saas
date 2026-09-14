import { supabase } from './supabaseClient';

let sessionInfo = { authUserId: null, profileId: null, role: null, complexId: null };

export function setErrorSession(info) {
  sessionInfo = { ...sessionInfo, ...info };
}

// Inserta el error en app_errors (fire-and-forget, nunca rompe la app)
export async function logError(message, extra = {}) {
  try {
    await supabase.from('app_errors').insert({
      message: String(message || 'Error desconocido').slice(0, 2000),
      stack: (extra.stack || '').slice(0, 4000) || null,
      url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      auth_user_id: sessionInfo.authUserId || null,
      profile_id: sessionInfo.profileId || null,
      role: sessionInfo.role || null,
      complex_id: sessionInfo.complexId || null,
      context: extra.context || null,
    });
  } catch {
    // Silencioso: el monitoreo jamás debe romper la app
  }
}

let handlersInstalled = false;

// Captura global: errores JS no controlados + promesas rechazadas
export function installGlobalErrorHandlers() {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;

  window.addEventListener('error', (event) => {
    logError(event.message || 'window.onerror', {
      stack: event.error?.stack,
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logError(reason?.message || String(reason || 'unhandledrejection'), {
      stack: reason?.stack,
      context: { type: 'unhandledrejection' },
    });
  });
}
