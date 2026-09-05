const APP_DATA_VERSION = '4';

function clearObsoleteAppData() {
  const previousVersion = localStorage.getItem('conjuntos_app_data_version');
  if (previousVersion !== APP_DATA_VERSION) {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('conjuntos_cache_') || key.startsWith('conjuntos_old_'))
      .forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
    localStorage.setItem('conjuntos_app_data_version', APP_DATA_VERSION);
  }
}

async function cleanupLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (script.endsWith('/sw.js')) {
        console.log('[PWA] Unregistering legacy service worker:', script);
        await reg.unregister();
      }
    }
  } catch (err) {
    console.warn('[PWA] Cleanup legacy service worker error:', err);
  }
}

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return;

  clearObsoleteAppData();

  window.addEventListener('load', async () => {
    await cleanupLegacyServiceWorkers();

    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update();
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nueva versión disponible, actualizando...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((error) => console.warn('[PWA] Service worker registration failed:', error));
  });
}

