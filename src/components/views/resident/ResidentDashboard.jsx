import React from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { StatCard } from '../../ui/StatCard';
import { QuickActions } from '../../ui/QuickActions';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { QrCode, Calendar, AlertTriangle, Megaphone, Home, FileText } from 'lucide-react';

export const ResidentDashboard = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { visitors, reservations, incidents, announcements } = useData();

  const myVisitors = visitors.filter(v => v.resident_id === currentUser?.id);
  const activeVisitors = myVisitors.filter(v => v.status === 'in' || v.status === 'registered');
  const myReservations = reservations.filter(r => r.resident_id === currentUser?.id);
  const pendingReservations = myReservations.filter(r => r.status === 'pending');
  const myIncidents = incidents.filter(i => i.reported_by === currentUser?.id);
  const openIncidents = myIncidents.filter(i => i.status === 'open' || i.status === 'in_progress');

  const quickActions = [
    { id: 'qa-visitors', title: 'Generar Pase de Visitante', description: 'Crea un código único para tu visitante', icon: <QrCode className="w-5 h-5" />, onClick: () => onNavigate('resident_visitors'), variant: 'emerald' },
    { id: 'qa-reservations', title: 'Reservar Área Común', description: 'Quincho, piscina, salón de eventos', icon: <Calendar className="w-5 h-5" />, onClick: () => onNavigate('resident_reservations'), variant: 'purple' },
    { id: 'qa-incidents', title: 'Reportar Incidente', description: 'Notificar un problema en el conjunto', icon: <AlertTriangle className="w-5 h-5" />, onClick: () => onNavigate('resident_incidents'), variant: 'amber' },
    { id: 'qa-announcements', title: 'Ver Comunicados', description: 'Avisos de la administración en tiempo real', icon: <Megaphone className="w-5 h-5" />, onClick: () => onNavigate('resident_announcements'), variant: 'sky' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Bienvenido, ${currentUser?.name?.split(' ')[0] || 'Residente'}`} subtitle={`Apartamento: ${currentUser?.apartment || 'No asignado'}`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Visitantes Activos" value={activeVisitors.length} icon={<QrCode className="w-5 h-5" />} variant="emerald" />
        <StatCard title="Reservas Pendientes" value={pendingReservations.length} icon={<Calendar className="w-5 h-5" />} variant="purple" />
        <StatCard title="Incidencias Abiertas" value={openIncidents.length} icon={<AlertTriangle className="w-5 h-5" />} variant="amber" />
        <StatCard title="Comunicados" value={announcements.length} icon={<Megaphone className="w-5 h-5" />} variant="sky" />
      </div>
      <QuickActions items={quickActions} title="Acciones Rápidas" />
      <Card title="Mis Visitantes Recientes">
        {myVisitors.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No tienes visitantes registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {myVisitors.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{v.visitor_name}</span>
                  <span className="text-slate-400 ml-2">{v.code}</span>
                </div>
                <Badge variant={v.status === 'in' ? 'emerald' : v.status === 'out' ? 'slate' : 'amber'} size="sm">{v.status.toUpperCase()}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
