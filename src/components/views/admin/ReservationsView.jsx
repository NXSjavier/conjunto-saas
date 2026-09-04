import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { EmptyState } from '../../ui/EmptyState';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS = {
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'slate',
};

export const ReservationsView = () => {
  const { reservations, updateReservationStatus } = useData();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return reservations;
    return reservations.filter((r) => r.status === statusFilter);
  }, [reservations, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas de Zonas Comunes"
        subtitle="Aprueba o rechaza las solicitudes de áreas comunes de los residentes."
        badge={<Badge variant="amber" size="sm">{reservations.filter((r) => r.status === 'pending').length} pendientes</Badge>}
      />

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={statusFilter === opt.value ? 'primary' : 'outline'}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title={statusFilter !== 'all' ? 'Sin reservas con ese filtro' : 'No hay reservas registradas'}
          description={
            statusFilter !== 'all'
              ? 'No se encontraron reservas con el estado seleccionado.'
              : 'Los residentes pueden solicitar reservas de áreas comunes desde su panel.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((reservation) => (
            <Card key={reservation.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{reservation.area_name}</h4>
                    <Badge variant={STATUS_COLORS[reservation.status] || 'slate'} size="sm">
                      {STATUS_LABELS[reservation.status] || reservation.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{reservation.resident_name}</span>
                    {reservation.apartment && <span>Apt: {reservation.apartment}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{reservation.reservation_date}</span>
                    <span>{reservation.start_time} - {reservation.end_time}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(reservation.created_at)}
                    </span>
                  </div>
                </div>

                {reservation.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="success"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => updateReservationStatus(reservation.id, 'approved')}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<XCircle className="w-3.5 h-3.5" />}
                      onClick={() => updateReservationStatus(reservation.id, 'rejected')}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
