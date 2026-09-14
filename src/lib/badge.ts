// Badge del lanzador web vía Badging API (Chrome/Edge en Android y desktop).
// No-op silencioso donde no esté soportado.

export function isBadgeSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
  } catch {
    return false;
  }
}

export async function setLauncherBadge(count: number): Promise<void> {
  try {
    if (!isBadgeSupported()) return;
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n === 0) {
      await (navigator as any).clearAppBadge?.();
    } else {
      await (navigator as any).setAppBadge?.(n);
    }
  } catch {
    // Ignore badge errors
  }
}

export async function incrementLauncherBadge(by = 1): Promise<void> {
  try {
    if (!isBadgeSupported()) return;
    const current = await (navigator as any).getAppBadge?.();
    const base = typeof current === 'number' ? current : 0;
    await (navigator as any).setAppBadge?.(base + by);
  } catch {
    // Fallback: no-op si getAppBadge no está disponible
  }
}

export async function clearLauncherBadge(): Promise<void> {
  try {
    if (!isBadgeSupported()) return;
    await (navigator as any).clearAppBadge?.();
  } catch {
    // Ignore badge errors
  }
}
