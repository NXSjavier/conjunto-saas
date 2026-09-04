import React, { useState } from 'react';
import { CalendarCheck, Check, X, Clock, User, Building2, MapPin } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { statusColor, statusLabel, formatDateOnly } from '../../../lib/utils';
import { ReservationStatus } from '../../../types';

export const ReservationsView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { reservations, updateReservationStatus } = useData();

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const complexId = currentComplex?.id || 1;
  const complexReservations = reservations.filter((r) => r.residential_complex_id === complexId);

  const filteredReservations = complexReservations.filter((res) => {
    return statusFilter === 'all' || res.status === statusFilter;
  });

  const handleUpdate = (id: number, status: ReservationStatus) => {
    updateReservationStatus(id, status);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas de Áreas Comunes"
        subtitle={`Gestión de quinchos, salones, piscinas y canchas en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="purple">{complexReservations.length} solicitudes</Badge>}
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Filtrar Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Todas las reservas</option>
            <option value="pending">Pendientes de Aprobación</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredReservations.length} resultado(s)
        </span>
      </div>

      {filteredReservations.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-7 w-7 text-purple-600" />}
          title="No hay reservas registradas"
          description="Cuando los residentes soliciten reservar zonas comunes aparecerán listadas aquí para su revisión."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((res) => {
            const colors = statusColor(res.status);
            return (
              <Card key={res.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{res.area_name}</h4>
                        <p className="text-[11px] text-slate-500">Fecha: {res.date}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {statusLabel(res.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Horario: <strong>{res.start_time} - {res.end_time}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Solicitante: <strong>{res.user_name}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Departamento: <strong>{res.apartment_number}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer if Pending */}
                {res.status === 'pending' ? (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdate(res.id, 'rejected')}
                      className="text-rose-600 hover:bg-rose-50"
                      icon={<X className="h-3.5 w-3.5" />}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdate(res.id, 'approved')}
                      icon={<Check className="h-3.5 w-3.5" />}
                    >
                      Aprobar
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-right">
                    Estado finalizado
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
