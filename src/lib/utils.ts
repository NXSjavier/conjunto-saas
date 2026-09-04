export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  const result: string[] = [];
  for (const item of classes) {
    if (!item) continue;
    if (typeof item === 'string') {
      result.push(item);
    } else if (typeof item === 'object') {
      for (const key in item) {
        if (item[key]) result.push(key);
      }
    }
  }
  return result.join(' ');
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatDateOnly(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Generates residential complex code: acronym(name)-YYYY-XXXX
 */
export function generateComplexCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let acronym = 'CJ';
  if (words.length >= 2) {
    acronym = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    acronym = words[0].slice(0, 2).toUpperCase();
  }
  const year = new Date().getFullYear();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${acronym}-${year}-${randomChars}`;
}

/**
 * Generates visitor code: XXXX-XXXX (random 1000-9999 + 1000-9999)
 */
export function generateVisitorCode(): string {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}`;
}

export function daysUntilExpiry(dateString?: string | null): number {
  if (!dateString) return 999;
  const target = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateDaysRemaining(dateString?: string | null): number {
  return daysUntilExpiry(dateString);
}

export function statusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'active':
    case 'confirmed':
    case 'in':
    case 'approved':
    case 'resolved':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700',
        border: 'border-emerald-500/30',
      };
    case 'trial':
    case 'pending':
    case 'in_progress':
    case 'registered':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-700',
        border: 'border-amber-500/30',
      };
    case 'past_due':
    case 'maintenance':
    case 'urgent':
    case 'high':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-700',
        border: 'border-orange-500/30',
      };
    case 'blocked':
    case 'rejected':
    case 'cancelled':
    case 'closed':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-700',
        border: 'border-rose-500/30',
      };
    case 'occupied':
    case 'out':
      return {
        bg: 'bg-sky-500/10',
        text: 'text-sky-700',
        border: 'border-sky-500/30',
      };
    case 'available':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
      };
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    blocked: 'Bloqueado',
    pending: 'Pendiente',
    trial: 'Prueba (Trial)',
    past_due: 'Vencido / Impago',
    available: 'Disponible',
    occupied: 'Ocupado',
    maintenance: 'En Mantenimiento',
    open: 'Abierta',
    in_progress: 'En Proceso',
    resolved: 'Resuelta',
    closed: 'Cerrada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    cancelled: 'Cancelada',
    registered: 'Registrado (Esperando)',
    confirmed: 'Confirmado',
    in: 'Adentro (Ingresó)',
    out: 'Salida Registrada',
    free: 'Free ($0)',
    pro: 'Pro ($24)',
    enterprise: 'Enterprise ($49)',
  };
  return map[status] || status;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
