import React from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { StatCard } from '../../ui/StatCard';
import { QuickActions } from '../../ui/QuickActions';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Building2, Users, ShieldCheck, DollarSign, Plus, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { generateMonthlySubscriptionsReportPDF } from '../../../lib/pdf';

export const SuperAdminDashboard = ({ onNavigate }) => {
  const { complexes, users, audits } = useData();
  const { currentUser } = useAuth();

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const activeComplexes = complexes.filter((c) => c.status === 'active').length;
  const estimatedRevenue = complexes.reduce((acc, c) => {
    if (c.plan === 'enterprise') return acc + 196000;
    if (c.plan === 'pro') return acc + 96000;
    return acc;
  }, 0);

  const quickActions = [
    {
      id: 'qa-complex',
      title: 'Crear Conjunto Residencial',
      description: 'Registra un nuevo condominio o edificio en el SaaS',
      icon: <Building2 className="w-5 h-5" />,
      onClick: () => onNavigate('super_complexes'),
      variant: 'emerald',
    },
    {
      id: 'qa-admin',
      title: 'Crear Cuenta de Administrador',
      description: 'Asigna un usuario administrador a un conjunto',
      icon: <ShieldCheck className="w-5 h-5" />,
      onClick: () => onNavigate('super_admins'),
      variant: 'purple',
    },
    {
      id: 'qa-subs',
      title: 'Gestionar Suscripciones',
      description: 'Revisa pagos, renovaciones y cambios de plan',
      icon: <DollarSign className="w-5 h-5" />,
      onClick: () => onNavigate('super_subscriptions'),
      variant: 'sky',
    },
    {
      id: 'qa-users',
      title: 'Auditoría y Purga de Cuentas',
      description: 'Eliminación segura en cascada con certificado PDF',
      icon: <Users className="w-5 h-5" />,
      onClick: () => onNavigate('super_users'),
      variant: 'rose',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
              Consola SaaS
            </span>
            <span className="text-xs text-slate-400">Plataforma Global</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">Panel Principal de Super Administrador</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo en tiempo real de todos los conjuntos residenciales, planes contratados y auditorías.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => generateMonthlySubscriptionsReportPDF(complexes, currentUser)}
            >
              Exportar Informe PDF
            </Button>
          )}
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => onNavigate('super_complexes')}>
            Nuevo Conjunto
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conjuntos Activos"
          value={`${activeComplexes} / ${complexes.length}`}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Condominios en línea"
          variant="emerald"
          onClick={() => onNavigate('super_complexes')}
        />
        <StatCard
          title="Administradores"
          value={totalAdmins}
          icon={<ShieldCheck className="w-5 h-5" />}
          subtitle="Cuentas asignadas"
          variant="purple"
          onClick={() => onNavigate('super_admins')}
        />
        <StatCard
          title="Ingreso Estimado"
          value={`$${(estimatedRevenue / 1000).toLocaleString('es-CO')}k COP`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="Facturación mensual"
          variant="sky"
          onClick={() => onNavigate('super_subscriptions')}
        />
        <StatCard
          title="Usuarios Totales"
          value={users.length}
          icon={<Users className="w-5 h-5" />}
          subtitle="Residentes y personal"
          variant="amber"
          onClick={() => onNavigate('super_users')}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions items={quickActions} />

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complexes Overview */}
        <Card
          title="Conjuntos Residenciales Recientes"
          subtitle="Estado y planes de suscripción"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('super_complexes')}>
              Ver todos
            </Button>
          }
        >
          <div className="divide-y divide-slate-800/60">
            {complexes.slice(0, 5).map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-slate-200 truncate">{c.name}</h5>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{c.address || 'Sin dirección'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'} size="sm">
                    {c.plan.toUpperCase()}
                  </Badge>
                  <Badge variant={c.status === 'active' ? 'emerald' : 'rose'} size="sm" dot>
                    {c.status === 'active' ? 'Activo' : 'Bloqueado'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Security Audit Log */}
        <Card
          title="Auditoría de Seguridad en Vivo"
          subtitle="Eventos y cambios críticos del sistema"
          action={
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WebSocket Sync
            </span>
          }
        >
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {audits.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">Sin eventos de auditoría registrados</div>
            ) : (
              audits.slice(0, 6).map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">{a.action.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    Operador: <span className="text-slate-300 font-medium">{a.user_name || 'Sistema'}</span> ({a.entity})
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
