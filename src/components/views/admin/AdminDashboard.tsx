import React, { useState } from 'react';
import {
  Home,
  Users,
  AlertTriangle,
  Megaphone,
  CalendarCheck,
  History,
  Shield,
  UserCheck,
  Building,
  FileSpreadsheet,
  Compass,
  Copy,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { QuickActions } from '../../ui/QuickActions';
import { SubscriptionAlert } from '../../ui/SubscriptionAlert';
import { copyToClipboard, statusColor, statusLabel, formatDateOnly } from '../../../lib/utils';
import { PLAN_LIMITS } from '../../../types';
import { soundEngine } from '../../../lib/sound';

export interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentComplex } = useAuth();
  const {
    apartments,
    users,
    incidents,
    announcements,
    reservations,
    visitors,
    blocks,
  } = useData();

  const [copied, setCopied] = useState(false);

  const complexId = currentComplex?.id || 1;
  const complexApts = apartments.filter((a) => a.residential_complex_id === complexId);
  const complexResidents = users.filter(
    (u) => u.residential_complex_id === complexId && u.role === 'resident' && u.status === 'active'
  );
  const pendingResidents = users.filter(
    (u) => u.requested_complex_id === complexId && u.status === 'pending'
  );
  const openIncidents = incidents.filter(
    (i) => i.residential_complex_id === complexId && (i.status === 'open' || i.status === 'in_progress')
  );
  const complexAnnouncements = announcements.filter((a) => a.residential_complex_id === complexId);
  const pendingReservations = reservations.filter(
    (r) => r.residential_complex_id === complexId && r.status === 'pending'
  );
  const todayVisitors = visitors.filter((v) => v.residential_complex_id === complexId);

  const planConfig = currentComplex ? PLAN_LIMITS[currentComplex.plan] : PLAN_LIMITS.pro;

  const handleCopyCode = async () => {
    if (!currentComplex?.code) return;
    const ok = await copyToClipboard(currentComplex.code);
    if (ok) {
      setCopied(true);
      soundEngine.playSuccessChime();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 14 Quick Actions items as specified in 4.2
  const quickActionsList = [
    {
      id: 'qa-pending',
      label: 'Aprobar Residentes',
      description: 'Verificar solicitudes pendientes con foto',
      icon: <UserCheck className="h-5 w-5" />,
      badge: pendingResidents.length > 0 ? `${pendingResidents.length}` : undefined,
      variant: 'rose' as const,
      onClick: () => onNavigate('admin_pending'),
    },
    {
      id: 'qa-announcement',
      label: 'Nuevo Comunicado',
      description: 'Publicar aviso general con adjuntos',
      icon: <Megaphone className="h-5 w-5" />,
      variant: 'emerald' as const,
      onClick: () => onNavigate('admin_announcements'),
    },
    {
      id: 'qa-apartment',
      label: 'Agregar Departamento',
      description: 'Registrar nueva unidad habitacional',
      icon: <Home className="h-5 w-5" />,
      variant: 'emerald' as const,
      onClick: () => onNavigate('admin_apartments'),
    },
    {
      id: 'qa-block',
      label: 'Torres y Bloques',
      description: 'Gestionar edificios y manzanas',
      icon: <Building className="h-5 w-5" />,
      variant: 'slate' as const,
      onClick: () => onNavigate('admin_blocks'),
    },
    {
      id: 'qa-resident',
      label: 'Directorio Residentes',
      description: 'Listado completo y contactos',
      icon: <Users className="h-5 w-5" />,
      variant: 'sky' as const,
      onClick: () => onNavigate('admin_residents'),
    },
    {
      id: 'qa-incidents',
      label: 'Revisar Incidencias',
      description: `${openIncidents.length} reportes requieren atención`,
      icon: <AlertTriangle className="h-5 w-5" />,
      badge: openIncidents.length > 0 ? `${openIncidents.length}` : undefined,
      variant: 'amber' as const,
      onClick: () => onNavigate('admin_incidents'),
    },
    {
      id: 'qa-reservations',
      label: 'Aprobar Reservas',
      description: `${pendingReservations.length} solicitudes de áreas comunes`,
      icon: <CalendarCheck className="h-5 w-5" />,
      badge: pendingReservations.length > 0 ? `${pendingReservations.length}` : undefined,
      variant: 'purple' as const,
      onClick: () => onNavigate('admin_reservations'),
    },
    {
      id: 'qa-visitors',
      label: 'Bitácora Visitantes',
      description: 'Historial de accesos e ingresos hoy',
      icon: <History className="h-5 w-5" />,
      variant: 'slate' as const,
      onClick: () => onNavigate('admin_visitors'),
    },
    {
      id: 'qa-guards',
      label: 'Guardias de Garita',
      description: 'Turnos y personal de vigilancia',
      icon: <Shield className="h-5 w-5" />,
      variant: 'amber' as const,
      onClick: () => onNavigate('admin_guards'),
    },
    {
      id: 'qa-reports',
      label: 'Reportes y Métricas',
      description: 'Gráficos de incidencias y uso',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      variant: 'sky' as const,
      onClick: () => onNavigate('admin_reports'),
    },
    {
      id: 'qa-audits',
      label: 'Registro de Auditoría',
      description: 'Trazabilidad de cambios y acciones',
      icon: <Compass className="h-5 w-5" />,
      variant: 'slate' as const,
      onClick: () => onNavigate('admin_audits'),
    },
    {
      id: 'qa-export',
      label: 'Código Expo React Native',
      description: 'Ver archivos y configuración Android',
      icon: <TrendingUp className="h-5 w-5" />,
      variant: 'purple' as const,
      onClick: () => onNavigate('expo_code_export'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subscription Alert Banner */}
      {currentComplex && (
        <SubscriptionAlert
          complex={currentComplex}
          apartmentCount={complexApts.length}
          maxApartments={planConfig.maxApartments}
          onUpgradeClick={() => onNavigate('expo_code_export')}
        />
      )}

      {/* Welcome & Copiable Code Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {currentComplex?.name || 'Las Praderas Residencial'}
            </h1>
            <Badge variant="emerald">{planConfig.name.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Panel de Administración General • {currentComplex?.city || 'Medellín'} • {complexApts.length} deptos registrados
          </p>
        </div>

        {/* Copiable Code Pill */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Código para Residentes:</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {currentComplex?.code || 'LP-2026-X8T5'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600 cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 6 StatCards (Section 4.2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label="Deptos"
          value={complexApts.length}
          icon={<Home className="h-5 w-5" />}
          variant="emerald"
          onClick={() => onNavigate('admin_apartments')}
        />
        <StatCard
          label="Residentes"
          value={complexResidents.length}
          icon={<Users className="h-5 w-5" />}
          variant="blue"
          onClick={() => onNavigate('admin_residents')}
        />
        <StatCard
          label="Incidencias"
          value={openIncidents.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={openIncidents.length > 0 ? 'red' : 'green'}
          trend={openIncidents.length > 0 ? 'Abiertas' : 'Al día'}
          trendPositive={openIncidents.length === 0}
          onClick={() => onNavigate('admin_incidents')}
        />
        <StatCard
          label="Comunicados"
          value={complexAnnouncements.length}
          icon={<Megaphone className="h-5 w-5" />}
          variant="purple"
          onClick={() => onNavigate('admin_announcements')}
        />
        <StatCard
          label="Reservas"
          value={pendingReservations.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          variant={pendingReservations.length > 0 ? 'amber' : 'slate'}
          trend={pendingReservations.length > 0 ? 'Por revisar' : '0 pendientes'}
          onClick={() => onNavigate('admin_reservations')}
        />
        <StatCard
          label="Visitas Hoy"
          value={todayVisitors.length}
          icon={<History className="h-5 w-5" />}
          variant="slate"
          onClick={() => onNavigate('admin_visitors')}
        />
      </div>

      {/* Pending Residents Banner if any */}
      {pendingResidents.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-200 p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-base shrink-0">
              {pendingResidents.length}
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                {pendingResidents.length === 1 ? '1 Residente solicita aprobación' : `${pendingResidents.length} Residentes solicitan aprobación`}
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Verifica las fotos de rostro y asigna las unidades habitacionales correspondientes.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onNavigate('admin_pending')}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Revisar Solicitudes
          </Button>
        </div>
      )}

      {/* Quick Actions Grid (14 items) */}
      <QuickActions
        title="Acciones y Accesos Rápidos del Administrador"
        actions={quickActionsList}
        columns={3}
      />

      {/* Recent Apartments Table (slice 10) */}
      <Card
        title="Departamentos y Estado de Ocupación"
        subtitle={`Mostrando últimas unidades registradas en ${currentComplex?.name || 'el conjunto'}`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('admin_apartments')}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Gestionar Todos
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 px-2">Unidad / Depto</th>
                <th className="pb-3 px-2">Torre / Bloque</th>
                <th className="pb-3 px-2">Piso</th>
                <th className="pb-3 px-2">Residente Asignado</th>
                <th className="pb-3 px-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complexApts.slice(0, 10).map((apt) => {
                const colors = statusColor(apt.status);
                return (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-bold text-slate-900">
                      {apt.number}
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-medium">
                      {apt.block_name || 'General'}
                    </td>
                    <td className="py-3 px-2 text-slate-500">
                      {apt.floor || '—'}
                    </td>
                    <td className="py-3 px-2 text-slate-700">
                      {apt.resident_name ? (
                        <span className="font-semibold text-emerald-800">{apt.resident_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Sin residente</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {statusLabel(apt.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
