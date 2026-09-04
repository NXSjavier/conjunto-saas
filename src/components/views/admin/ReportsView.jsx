import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Badge } from '../../ui/Badge';
import { Users, Building, QrCode, CheckCircle2, BarChart3, Lock } from 'lucide-react';

export const ReportsView = () => {
  const { users, apartments, visitors, incidents } = useData();
  const { currentComplex } = useAuth();

  const stats = useMemo(() => {
    const activeResidents = users.filter((u) => u.role === 'resident' && u.status === 'active').length;
    const occupiedApts = apartments.filter((a) => a.status === 'occupied').length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyVisitors = visitors.filter((v) => {
      const d = new Date(v.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const resolvedIncidents = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;

    return { activeResidents, occupiedApts, monthlyVisitors, resolvedIncidents, totalIncidents: incidents.length };
  }, [users, apartments, visitors, incidents]);

  const barData = useMemo(() => {
    return [
      { label: 'Residentes', value: stats.activeResidents, max: apartments.length || 1, color: 'bg-emerald-500' },
      { label: 'Apartamentos', value: stats.occupiedApts, max: apartments.length || 1, color: 'bg-sky-500' },
      { label: 'Visitas Mes', value: stats.monthlyVisitors, max: Math.max(stats.monthlyVisitors, 1), color: 'bg-purple-500' },
      { label: 'Incidencias Resueltas', value: stats.resolvedIncidents, max: stats.totalIncidents || 1, color: 'bg-amber-500' },
    ];
  }, [stats, apartments.length]);

  const isPro = currentComplex?.plan === 'pro' || currentComplex?.plan === 'enterprise';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y Métricas"
        subtitle="Estadísticas e indicadores clave del conjunto residencial."
        badge={
          <Badge variant={isPro ? 'emerald' : 'amber'} size="sm">
            {isPro ? currentComplex.plan.toUpperCase() : 'Plan Gratuito'}
          </Badge>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Residentes"
          value={stats.activeResidents}
          icon={<Users className="w-5 h-5" />}
          subtitle="Activos en el conjunto"
          variant="emerald"
        />
        <StatCard
          title="Apartamentos Ocupados"
          value={`${stats.occupiedApts} / ${apartments.length}`}
          icon={<Building className="w-5 h-5" />}
          subtitle="Unidades asignadas"
          variant="sky"
        />
        <StatCard
          title="Visitas Este Mes"
          value={stats.monthlyVisitors}
          icon={<QrCode className="w-5 h-5" />}
          subtitle="Registros del período"
          variant="purple"
        />
        <StatCard
          title="Incidencias Resueltas"
          value={`${stats.resolvedIncidents} / ${stats.totalIncidents}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle="Casos cerrados"
          variant="amber"
        />
      </div>

      {/* Bar Chart */}
      <Card title="Distribución de Métricas" subtitle="Comparativa visual de los indicadores principales">
        <div className="space-y-5 mt-2">
          {barData.map((bar) => {
            const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0;
            return (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">{bar.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{bar.value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar.color} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Coming Soon */}
      <Card>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-200">Exportar a PDF</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera informes detallados en formato PDF para junta de administración y auditorías.
            </p>
          </div>
          <Badge variant="amber" size="sm">Próximamente</Badge>
        </div>
      </Card>
    </div>
  );
};
