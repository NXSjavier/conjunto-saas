export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateOnly(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function generateVisitorCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIS-${p1}`;
}

export function generateComplexCode(name) {
  const prefix = (name || 'RES').substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'C');
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return 30;
  const now = new Date().getTime();
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
