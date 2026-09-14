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

const IMPORT_ERROR = /Failed to fetch dynamically imported module/i;

// Tras un deploy los hashes de los chunks cambian. Si la PWA quedó abierta,
// un import dinámico puede apuntar a un chunk ya eliminado del servidor.
// Recargamos una vez (máx. 1 vez cada 30s) para tomar el index.html nuevo.
function recoverFromStaleChunk() {
  try {
    const last = parseInt(sessionStorage.getItem('residex_import_retry_at') || '0', 10);
    if (Date.now() - last > 30000) {
      sessionStorage.setItem('residex_import_retry_at', String(Date.now()));
      window.location.reload();
    }
  } catch { /* silencioso */ }
}

// Captura global: errores JS no controlados + promesas rechazadas
export function installGlobalErrorHandlers() {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (IMPORT_ERROR.test(msg)) recoverFromStaleChunk();
    logError(event.message || 'window.onerror', {
      stack: event.error?.stack,
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || 'unhandledrejection');
    if (IMPORT_ERROR.test(msg)) recoverFromStaleChunk();
    logError(reason?.message || String(reason || 'unhandledrejection'), {
      stack: reason?.stack,
      context: { type: 'unhandledrejection' },
    });
  });
}
