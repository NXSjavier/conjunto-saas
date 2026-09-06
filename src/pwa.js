const APP_DATA_VERSION = '5';

function clearObsoleteAppData() {
  try {
    const previousVersion = localStorage.getItem('conjuntos_app_data_version');
    if (previousVersion !== APP_DATA_VERSION) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('conjuntos_cache_') || key.startsWith('conjuntos_old_'))
        .forEach((key) => localStorage.removeItem(key));
      try { sessionStorage.clear(); } catch {}
      localStorage.setItem('conjuntos_app_data_version', APP_DATA_VERSION);
    }
  } catch {}
}

/**
 * Desregistra TODO service worker que no sea el firebase-messaging-sw.js / (scope '/').
 * Evita conflictos que impiden que FCM entregue las push en 2do plano (PWA instalada).
 */
async function cleanupConflictingServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const urls = [
        reg.active?.scriptURL || '',
        reg.waiting?.scriptURL || '',
        reg.installing?.scriptURL || '',
      ];
      const keep = urls.some((u) => u && /firebase-messaging-sw\.js(\?|#|$)/i.test(u));
      if (!keep) {
        try { await reg.unregister(); } catch {}
      }
    }
  } catch (err) {
    console.warn('[PWA] cleanup SW error:', err);
  }
}

export async function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  clearObsoleteAppData();

  const runRegistration = async () => {
    await cleanupConflictingServiceWorkers();

    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      let reg;
      if (existing) {
        reg = existing;
      } else {
        reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      }

      try { await reg.update(); } catch {}
      try { await navigator.serviceWorker.ready; } catch {}

      if (reg && reg.waiting) {
        try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
      }

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              try { window.location.reload(); } catch {}
            }
          };
        }
      };
    } catch (error) {
      console.warn('[PWA] Service worker registration failed:', error);
    }
  };

  try {
    if (document.readyState === 'complete') {
      runRegistration();
    } else {
      window.addEventListener('load', runRegistration, { once: true });
    }
  } catch {
    try { window.addEventListener('load', runRegistration, { once: true }); } catch {}
  }
}
