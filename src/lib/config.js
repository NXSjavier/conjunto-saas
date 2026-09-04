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

// true = la app corre empaquetada sin servidor local -> habla directo a Supabase cloud
export const isStandalone = () => isNative();

// En standalone no hay servidor local: apiBase vacío -> se usa Supabase directo
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  // En móvil standalone no usamos 10.0.2.2, usamos Supabase cloud
  return '';
};

export const getWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_BASE_URL) return import.meta.env.VITE_WS_BASE_URL;
  return window.location.origin;
};
