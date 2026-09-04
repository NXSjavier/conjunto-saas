import React from 'react';
import {
  Home,
  QrCode,
  CalendarCheck,
  Megaphone,
  AlertTriangle,
  User,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { statusColor, statusLabel, formatDateOnly, copyToClipboard } from '../../../lib/utils';
import { soundEngine } from '../../../lib/sound';

export interface ResidentDashboardProps {
  onNavigate: (view: string) => void;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ onNavigate }) => {
  const { currentUser, currentComplex } = useAuth();
  const { announcements, visitors, reservations, incidents } = useData();

  const myVisitors = visitors.filter((v) => v.created_by === currentUser?.id);
  const myReservations = reservations.filter((r) => r.user_id === currentUser?.id);
  const myIncidents = incidents.filter((i) => i.reported_by === currentUser?.id);
  const complexAnnouncements = announcements.filter(
    (a) => a.residential_complex_id === (currentComplex?.id || 1)
  );

  const activeVisitors = myVisitors.filter((v) => v.status === 'registered' || v.status === 'in');

  const handleCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      soundEngine.playSuccessChime();
    }
  };

  return (
    <div className="space-y-6">
      {/* Resident Welcome Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={
              currentUser?.face_photo_path ||
              currentUser?.avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            }
            alt={currentUser?.name}
            className="h-16 w-16 rounded-2xl object-cover border-2 border-sky-400/50 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{currentUser?.name}</h1>
              <Badge variant="sky">Residente</Badge>
            </div>
            <p className="text-xs text-sky-200 mt-0.5">
              {currentComplex?.name || 'Las Praderas'} • <strong>{currentUser?.apartment_number || 'Apto 101'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('resident_visitors')}
            icon={<QrCode className="h-4 w-4" />}
          >
            Nuevo Pase de Visita
          </Button>
        </div>
      </div>

      {/* Resident Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          label="Visitas Activas"
          value={activeVisitors.length}
          icon={<QrCode className="h-5 w-5" />}
          variant="blue"
          onClick={() => onNavigate('resident_visitors')}
        />
        <StatCard
          label="Mis Reservas"
          value={myReservations.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          variant="purple"
          onClick={() => onNavigate('resident_reservations')}
        />
        <StatCard
          label="Mis Reportes"
          value={myIncidents.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="amber"
          onClick={() => onNavigate('resident_incidents')}
        />
        <StatCard
          label="Comunicados"
          value={complexAnnouncements.length}
          icon={<Megaphone className="h-5 w-5" />}
          variant="green"
          onClick={() => onNavigate('resident_announcements')}
        />
      </div>

      {/* Active Visitor Passes Section */}
      <Card
        title="Mis Pases de Visitas Recientes"
        subtitle="Comparte el código con tu visitante para que el guardia valide su acceso en garita"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('resident_visitors')}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Generar Código
          </Button>
        }
      >
        {myVisitors.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No tienes pases de visitas generados. Haz clic en "Generar Código" para crear uno.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {myVisitors.slice(0, 4).map((vis) => {
              const colors = statusColor(vis.status);
              return (
                <div
                  key={vis.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{vis.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {vis.document_number ? `Doc: ${vis.document_number}` : 'Visita autorizada'}
                      </p>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {statusLabel(vis.status)}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Código:</span>
                      <span className="font-mono font-bold text-sm text-emerald-700 tracking-wider">
                        {vis.code}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(vis.code)}
                      icon={<Copy className="h-3.5 w-3.5" />}
                      className="bg-white hover:bg-slate-50 text-xs py-1"
                    >
                      Copiar Código
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Latest Announcement */}
      {complexAnnouncements.length > 0 && (
        <Card
          title="Último Comunicado Oficial"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('resident_announcements')}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Ver Todos
            </Button>
          }
        >
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">{complexAnnouncements[0].title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {complexAnnouncements[0].body}
            </p>
            <div className="pt-2 text-[11px] text-slate-400">
              Publicado el {formatDateOnly(complexAnnouncements[0].created_at)} por {complexAnnouncements[0].author_name}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
