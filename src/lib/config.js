export const isCapacitor = () => {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
};

export const isNative = () => {
  try {
    const cap = isCapacitor();
    const proto = window.location.protocol;
    return cap || proto === 'capacitor:' || proto === 'ionic:';
  } catch {
    return false;
  }
};

// Arquitectura objetivo: Solo Supabase + Vercel (sin Fly/Render).
// isStandalone = true en Vercel cuando NO hay VITE_API_BASE_URL -> usa Supabase directo + Edge Functions.
// En Capacitor también es standalone.
export const isStandalone = () => isNative();

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
