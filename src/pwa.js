const APP_DATA_VERSION = '5';

let autoUpdateStarted = false;

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
        console.log('🧹 Desregistrando SW conflictivo:', urls);
        try { await reg.unregister(); } catch {}
      }
    }
  } catch (err) {
    console.warn('[PWA] cleanup SW error:', err);
  }
}

/**
 * ✅ Verifica si la app está instalada como PWA
 */
export function isPwaInstalled() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator.standalone === true);
  } catch {
    return false;
  }
}

/**
 * ✅ Verifica si es Android
 */
function isAndroid() {
  try {
    return /Android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * ✅ Detección del beforeinstallprompt para mostrar UI de instalación
 */
let deferredPrompt = null;
let installCallback = null;

export function onBeforeInstallPrompt(callback) {
  installCallback = callback;
  if (deferredPrompt) {
    try { callback(deferredPrompt); } catch {}
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installCallback) {
      try { installCallback(e); } catch {}
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA instalada');
    deferredPrompt = null;
  });
}

/**
 * ✅ Verifica si el Service Worker está activo
 */
export async function isServiceWorkerActive() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    return !!(reg && reg.active);
  } catch {
    return false;
  }
}

/**
 * ✅ Ping al Service Worker para mantenerlo vivo
 */
export async function pingServiceWorker() {
  try {
    const reg = await navigator.serviceWorker.ready;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      reg.active?.postMessage({ type: 'PING_FCM' }, [channel.port2]);
      
      setTimeout(() => resolve(null), 5000);
    });
  } catch {
    return null;
  }
}

/**
 * ✅ Registro principal de la PWA (VERSIÓN MEJORADA)
 */
export async function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker no soportado');
    return null;
  }

  clearObsoleteAppData();

  const isAndroidDevice = isAndroid();
  const isInstalled = isPwaInstalled();
  
  console.log('📱 Estado PWA:', { isAndroidDevice, isInstalled });

  const runRegistration = async () => {
    // Limpiar SW conflictivos
    await cleanupConflictingServiceWorkers();

    try {
      // Intentar obtener el SW existente
      let reg = await navigator.serviceWorker.getRegistration('/');
      
      // Si no existe o el SW no está activo, registrarlo
      if (!reg || !reg.active) {
        console.log('📨 Registrando Service Worker...');
        reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      }

      // Forzar actualización en Android
      if (isAndroidDevice || isInstalled) {
        console.log('📱 Forzando actualización para Android/PWA');
        try { await reg.update(); } catch {}
        
        // Si hay un SW en waiting, activarlo
        if (reg.waiting) {
          console.log('⏳ Activando SW en waiting...');
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        }
      }

      // Esperar a que el SW esté listo
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker listo');

      // Obtener el SW activo
      const activeReg = await navigator.serviceWorker.getRegistration('/');
      
      if (activeReg && activeReg.active) {
        console.log('✅ SW activo:', activeReg.active.scriptURL);
        
        // Iniciar keep-alive en Android
        if (isAndroidDevice || isInstalled) {
          activeReg.active.postMessage({ 
            type: 'START_KEEP_ALIVE',
            platform: isAndroidDevice ? 'android' : 'pwa'
          });
        }
      }

      // ============================================================
      // ✅ AUTO-ACTUALIZACIÓN TRAS DEPLOY
      // Chequea el servidor cada 60 s y al volver a la pestaña; si hay
      // una versión nueva, la PWA abierta se recarga sola.
      // ============================================================
      let reloading = false;
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // Recargar solo cuando el nuevo SW ya controla (activado)
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller && !reloading) {
            reloading = true;
            console.log('🔄 Nueva versión detectada, actualizando app...');
            setTimeout(() => { try { window.location.reload(); } catch {} }, 400);
          }
        });
      });

      if (!autoUpdateStarted) {
        autoUpdateStarted = true;
        const checkForUpdate = async () => {
          try {
            const currentReg = await navigator.serviceWorker.getRegistration('/');
            if (currentReg && navigator.serviceWorker.controller) {
              await currentReg.update();
            }
          } catch {}
        };
        setInterval(checkForUpdate, 60000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      }

      // Si está instalada como PWA, mantener SW vivo con pings periódicos
      if (isInstalled) {
        console.log('📱 PWA instalada - manteniendo SW vivo');
        setTimeout(async () => {
          const ping = await pingServiceWorker();
          if (!ping) {
            console.warn('⚠️ SW no responde, intentando re-registrar');
            try {
              await reg.update();
            } catch {}
          }
        }, 10000);
      }

      return reg;
    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
      
      // Intentar recuperación
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg) {
          await reg.unregister();
          console.log('🧹 SW desregistrado para recuperación');
          // Reintentar
          return navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
        }
      } catch (retryError) {
        console.error('❌ Error en recuperación:', retryError);
      }
      return null;
    }
  };

  if (document.readyState === 'complete') {
    return await runRegistration();
  }
  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      resolve(await runRegistration());
    }, { once: true });
  });
}

/**
 * ✅ Forzar re-registro del Service Worker (útil para debugging)
 */
export async function forceReRegisterPwa() {
  try {
    console.log('🔄 Forzando re-registro de SW...');
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      await reg.unregister();
      console.log('🧹 SW desregistrado');
    }
    const result = await registerPwa();
    console.log('✅ SW re-registrado');
    return result;
  } catch (error) {
    console.error('❌ Error en forceReRegisterPwa:', error);
    return false;
  }
}