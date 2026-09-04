import React from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { StatCard } from '../../ui/StatCard';
import { QuickActions } from '../../ui/QuickActions';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SubscriptionAlert } from '../../ui/SubscriptionAlert';
import {
  Users,
  Building,
  UserCheck,
  Calendar,
  AlertTriangle,
  Megaphone,
  Shield,
  QrCode,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const AdminDashboard = ({ onNavigate }) => {
  const { currentComplex } = useAuth();
  const {
    apartments,
    users,
    visitors,
    reservations,
    incidents,
    announcements,
    approveResident,
  } = useData();

  const pendingResidents = users.filter((u) => u.status === 'pending');
  const activeResidents = users.filter((u) => u.role === 'resident' && u.status === 'active');
  const occupiedApts = apartments.filter((a) => a.status === 'occupied').length;
  const todayVisitors = visitors.length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending');
  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'in_progress');

  const quickActions = [
    {
      id: 'qa-pending',
      title: 'Aprobar Residentes',
      description: `${pendingResidents.length} solicitudes con foto pendientes`,
      icon: <UserCheck className="w-5 h-5" />,
      badge: pendingResidents.length > 0 ? `${pendingResidents.length} Nuevas` : undefined,
      onClick: () => onNavigate('admin_pending'),
      variant: 'emerald',
    },
    {
      id: 'qa-announcement',
      title: 'Publicar Comunicado',
      description: 'Avisos con comentarios en vivo a los residentes',
      icon: <Megaphone className="w-5 h-5" />,
      onClick: () => onNavigate('admin_announcements'),
      variant: 'sky',
    },
    {
      id: 'qa-reservations',
      title: 'Reservas de Zonas',
      description: `${pendingReservations.length} solicitudes de áreas comunes`,
      icon: <Calendar className="w-5 h-5" />,
      badge: pendingReservations.length > 0 ? `${pendingReservations.length}` : undefined,
      onClick: () => onNavigate('admin_reservations'),
      variant: 'purple',
    },
    {
      id: 'qa-incidents',
      title: 'Incidencias y Reportes',
      description: `${openIncidents.length} casos en atención activa`,
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: openIncidents.length > 0 ? `${openIncidents.length}` : undefined,
      onClick: () => onNavigate('admin_incidents'),
      variant: 'amber',
    },
    {
      id: 'qa-apartments',
      title: 'Gestión de Apartamentos',
      description: 'Inventario de unidades y asignaciones',
      icon: <Building className="w-5 h-5" />,
      onClick: () => onNavigate('admin_apartments'),
      variant: 'emerald',
    },
    {
      id: 'qa-guards',
      title: 'Personal de Portería',
      description: 'Guardas autorizados para el control de acceso',
      icon: <Shield className="w-5 h-5" />,
      onClick: () => onNavigate('admin_guards'),
      variant: 'sky',
    },
    {
      id: 'qa-visitors',
      title: 'Bitácora de Visitas',
      description: 'Registro de ingresos y salidas con código',
      icon: <QrCode className="w-5 h-5" />,
      onClick: () => onNavigate('admin_visitors'),
      variant: 'purple',
    },
    {
      id: 'qa-reports',
      title: 'Reportes y Métricas',
      description: 'Estadísticas del conjunto (Plan Pro)',
      icon: <CheckCircle2 className="w-5 h-5" />,
      onClick: () => onNavigate('admin_reports'),
      variant: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              {currentComplex?.plan.toUpperCase() || 'PRO'} SaaS
            </span>
            <span className="text-xs text-slate-400 font-mono">Código: {currentComplex?.code}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">{currentComplex?.name || 'Administración de Conjunto'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Panel de control integral para gestión de residentes, accesos, áreas comunes y seguridad.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onNavigate('admin_announcements')}>
            Nuevo Aviso
          </Button>
          <Button size="sm" onClick={() => onNavigate('admin_apartments')}>
            Gestionar Unidades
          </Button>
        </div>
      </div>

      <SubscriptionAlert complex={currentComplex} onUpgrade={() => onNavigate('admin_reports')} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Residentes Activos"
          value={activeResidents.length}
          icon={<Users className="w-5 h-5" />}
          subtitle="En el conjunto"
          variant="emerald"
          onClick={() => onNavigate('admin_residents')}
        />
        <StatCard
          title="Ocupación de Unidades"
          value={`${occupiedApts} / ${apartments.length}`}
          icon={<Building className="w-5 h-5" />}
          subtitle="Apartamentos asignados"
          variant="sky"
          onClick={() => onNavigate('admin_apartments')}
        />
        <StatCard
          title="Pases de Visitantes"
          value={todayVisitors}
          icon={<QrCode className="w-5 h-5" />}
          subtitle="Registrados en el sistema"
          variant="purple"
          onClick={() => onNavigate('admin_visitors')}
        />
        <StatCard
          title="Incidencias Abiertas"
          value={openIncidents.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Pendientes de solución"
          variant="amber"
          onClick={() => onNavigate('admin_incidents')}
        />
      </div>

      {/* Quick Actions Grid */}
      <QuickActions items={quickActions} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card
          title={`Residentes Pendientes de Aprobación (${pendingResidents.length})`}
          subtitle="Verifica la fotografía facial y autoriza el ingreso a la unidad"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('admin_pending')}>
              Ver todos
            </Button>
          }
        >
          {pendingResidents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No hay solicitudes de residentes pendientes por autorizar.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingResidents.slice(0, 3).map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {p.face_photo ? (
                      <img src={p.face_photo} alt="Foto" className="w-10 h-10 rounded-full object-cover border border-emerald-500/40" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.apartment || 'Unidad por asignar'} • {p.email}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="success" onClick={() => approveResident(p.id, p.apartment)}>
                    Aprobar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live Announcements */}
        <Card
          title="Últimos Comunicados de la Administración"
          subtitle="Mensajes sincronizados en tiempo real con comentarios"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('admin_announcements')}>
              Gestionar
            </Button>
          }
        >
          {announcements.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No se han publicado comunicados aún.</div>
          ) : (
            <div className="space-y-3">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-semibold text-slate-200">{a.title}</h5>
                    <span className="text-[10px] text-slate-500">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-slate-400 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
