import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { StatCard } from '../../ui/StatCard';
import { PLAN_LIMITS } from '../../../types.js';
import { daysUntilExpiry, formatDateOnly } from '../../../lib/utils';
import { CreditCard, CalendarClock, Building2, Users, Shield, LayoutGrid, LifeBuoy } from 'lucide-react';

function UsageBar({ used, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="text-slate-400">{used} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const BillingView = () => {
  const { currentComplex } = useAuth();
  const { apartments, guards, reservations } = useData();

  if (!currentComplex) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mi Suscripción" subtitle="Plan y facturación de tu conjunto" />
        <Card>
          <p className="text-sm text-slate-400 text-center py-6">No hay un conjunto asignado a tu cuenta.</p>
        </Card>
      </div>
    );
  }

  const plan = currentComplex.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const daysLeft = daysUntilExpiry(currentComplex.subscription_expiry);
  const expired = daysLeft <= 0;
  const distinctAreas = new Set((reservations || []).map((r) => r.area_name).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Suscripción"
        subtitle={`Plan y facturación de ${currentComplex.name || 'tu conjunto'}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Plan actual"
          value={limits.name || plan.toUpperCase()}
          icon={<CreditCard className="w-5 h-5" />}
          subtitle={`Estado: ${expired ? 'Vencido' : currentComplex.subscription_status || 'Activo'}`}
          variant={expired ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Vencimiento"
          value={currentComplex.subscription_expiry ? formatDateOnly(currentComplex.subscription_expiry) : '—'}
          icon={<CalendarClock className="w-5 h-5" />}
          subtitle={daysLeft > 0 ? `${daysLeft} días restantes` : 'Suscripción vencida'}
          variant={expired ? 'rose' : daysLeft <= 7 ? 'amber' : 'sky'}
        />
        <StatCard
          title="Código del conjunto"
          value={currentComplex.code || '—'}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Compártelo con nuevos residentes"
          variant="slate"
        />
      </div>

      <Card title="Uso de tu plan" subtitle={`Límites incluidos en ${limits.name || plan}`}>
        <div className="space-y-4">
          <UsageBar used={(apartments || []).length} max={limits.max_apartments} label="Apartamentos" />
          <UsageBar used={(guards || []).length} max={limits.max_guards} label="Guardas" />
          <UsageBar used={distinctAreas} max={limits.max_areas} label="Áreas comunes en uso" />
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
            <Users className="w-3.5 h-3.5" />
            Residentes y visitantes ilimitados en todos los planes.
          </div>
        </div>
      </Card>

      <Card title="Pagos" subtitle="Cómo mantener tu suscripción al día">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <LifeBuoy className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p className="font-bold text-white">¿Necesitas renovar o cambiar de plan?</p>
            <p className="mt-1 text-slate-400">
              Por ahora los pagos se coordinan directamente con el Super Admin
              desde el botón <strong className="text-slate-200">Soporte</strong> del menú.
              Próximamente podrás pagar en línea desde aquí.
            </p>
            <div className="flex items-center gap-2 mt-2 text-slate-500">
              <Shield className="w-3.5 h-3.5" />
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Tus datos y los de tus residentes están protegidos (LOPDP Ecuador).</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
