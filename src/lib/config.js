// PWA pura: sin Capacitor. Detectamos si corre como app instalada (standalone).
export const isStandalone = () => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
};

// En modo Supabase puro retorna '' -> DataContext usa supabase directo + Edge Functions
// Si algún día quieres backend legacy, define VITE_API_BASE_URL=https://...
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  return '';
};

export const getWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_BASE_URL) return import.meta.env.VITE_WS_BASE_URL;
  return window.location.origin;
};
