const APP_DATA_VERSION = '2';

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

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return;

  clearObsoleteAppData();

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('Service worker registration failed:', error));
  });
}
