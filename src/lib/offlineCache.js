import { useState, useEffect } from 'react';

const KEY = (complexId) => `residex_cache_announcements_${complexId || 'global'}`;

// Guarda los últimos comunicados para lectura sin conexión
export function saveCachedAnnouncements(complexId, list) {
  try {
    if (!Array.isArray(list) || list.length === 0) return;
    localStorage.setItem(KEY(complexId), JSON.stringify({
      savedAt: new Date().toISOString(),
      items: list.slice(0, 20),
    }));
  } catch {}
}

export function getCachedAnnouncements(complexId) {
  try {
    const raw = localStorage.getItem(KEY(complexId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.items) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Elimina el caché de un conjunto (cuando online confirma que ya no hay nada)
export function clearCachedAnnouncements(complexId) {
  try {
    localStorage.removeItem(KEY(complexId));
  } catch {}
}

// Hook: estado de conexión (online/offline)
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}
