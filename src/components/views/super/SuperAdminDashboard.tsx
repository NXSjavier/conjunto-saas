import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Plus,
  ArrowRight,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { QuickActions } from '../../ui/QuickActions';
import { formatDateOnly } from '../../../lib/utils';

export interface SuperAdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const { complexes, users, apartments } = useData();

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const activeSubs = complexes.filter((c) => c.subscription_status === 'active').length;
  const trialSubs = complexes.filter((c) => c.subscription_status === 'trial').length;
  const blockedSubs = complexes.filter((c) => c.subscription_status === 'blocked').length;

  const superActions = [
    {
      id: 'sq-complexes',
      label: 'Conjuntos Residenciales',
      description: `${complexes.length} condominios registrados`,
      icon: <Building2 className="h-5 w-5" />,
      variant: 'purple' as const,
      onClick: () => onNavigate('super_complexes'),
    },
    {
      id: 'sq-subs',
      label: 'Suscripciones SaaS',
      description: 'Facturación, pagos y bloqueos',
      icon: <CreditCard className="h-5 w-5" />,
      variant: 'emerald' as const,
      onClick: () => onNavigate('super_subscriptions'),
    },
    {
      id: 'sq-admins',
      label: 'Administradores',
      description: 'Gestión de cuentas y accesos',
      icon: <Users className="h-5 w-5" />,
      variant: 'sky' as const,
      onClick: () => onNavigate('super_admins'),
    },
    {
      id: 'sq-purge',
      label: 'Usuarios & Purga BD + PDF',
      description: 'Borrado definitivo con certificado',
      icon: <UserX className="h-5 w-5" />,
      variant: 'rose' as const,
      onClick: () => onNavigate('super_users'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Super Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-purple-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Panel Super Admin Global</h1>
            <Badge variant="purple">Master Cloud</Badge>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            Control multinquilino (Multi-tenant) de condominios, facturación y planes SaaS
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('super_complexes')}
          icon={<Plus className="h-4 w-4" />}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
        >
          Nuevo Conjunto
        </Button>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Conjuntos"
          value={complexes.length}
          icon={<Building2 className="h-5 w-5" />}
          variant="purple"
          onClick={() => onNavigate('super_complexes')}
        />
        <StatCard
          label="Suscripciones Activas"
          value={activeSubs}
          icon={<CreditCard className="h-5 w-5" />}
          variant="emerald"
          onClick={() => onNavigate('super_subscriptions')}
        />
        <StatCard
          label="En Período de Prueba"
          value={trialSubs}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="blue"
          onClick={() => onNavigate('super_subscriptions')}
        />
        <StatCard
          label="Bloqueados / Vencidos"
          value={blockedSubs}
          icon={<ShieldCheck className="h-5 w-5" />}
          variant={blockedSubs > 0 ? 'red' : 'slate'}
          onClick={() => onNavigate('super_subscriptions')}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions
        title="Accesos Rápidos de Plataforma"
        actions={superActions}
        columns={3}
      />

      {/* Registered Complexes List */}
      <Card
        title="Conjuntos Residenciales Registrados"
        subtitle="Resumen de planes y vencimientos de suscripción"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('super_complexes')}
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Ver Detalle Completo
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 px-2">Nombre Conjunto</th>
                <th className="pb-3 px-2">Código</th>
                <th className="pb-3 px-2">Plan</th>
                <th className="pb-3 px-2">Estado Suscripción</th>
                <th className="pb-3 px-2">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complexes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2 font-bold text-slate-900">
                    <div>{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.city} - {c.address}</div>
                  </td>
                  <td className="py-3 px-2 font-mono font-bold text-emerald-700">
                    {c.code}
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'}>
                      {c.plan.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={c.subscription_status === 'active' ? 'emerald' : c.subscription_status === 'trial' ? 'sky' : 'rose'}>
                      {c.subscription_status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-slate-600">
                    {c.current_period_end ? formatDateOnly(c.current_period_end) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
