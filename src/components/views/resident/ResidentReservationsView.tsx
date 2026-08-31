import React, { useState } from 'react';
import { CalendarCheck, Plus, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { FlashMessage } from '../../ui/FlashMessage';
import { statusColor, statusLabel } from '../../../lib/utils';

export const ResidentReservationsView: React.FC = () => {
  const { currentUser, currentComplex } = useAuth();
  const { reservations, createReservation } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('Quincho / Parrilla Principal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const myReservations = reservations.filter((r) => r.user_id === currentUser?.id);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName || !date || !startTime || !endTime) {
      setFlash({ message: 'Completa todos los campos de la reserva', type: 'error' });
      return;
    }

    createReservation({
      areaName,
      date,
      startTime,
      endTime,
    });

    setFlash({ message: 'Solicitud de reserva enviada al administrador', type: 'success' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Reservas de Áreas Comunes"
        subtitle="Solicita el uso de quinchos, salones de eventos, piscinas o canchas"
        badge={<Badge variant="purple">{myReservations.length} solicitudes</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Nueva Reserva
          </Button>
        }
      />

      {myReservations.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-7 w-7 text-purple-600" />}
          title="No has reservado áreas comunes"
          description="Selecciona una fecha y horario para apartar las zonas recreativas de tu conjunto."
          actionLabel="Hacer una Reserva"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myReservations.map((res) => {
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

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Horario: <strong>{res.start_time} - {res.end_time}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                  {res.status === 'pending'
                    ? 'En espera de aprobación'
                    : res.status === 'approved'
                    ? 'Reserva confirmada'
                    : 'Solicitud cerrada'}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Create Reservation */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reservar Área Común"
        subtitle="Envía tu solicitud de reserva para confirmación"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Área a Reservar
            </label>
            <select
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-purple-200 focus:outline-none"
            >
              <option value="Quincho / Parrilla Principal">Quincho / Parrilla Principal</option>
              <option value="Salón de Eventos y Cumpleaños">Salón de Eventos y Cumpleaños</option>
              <option value="Cancha Sintética de Fútbol">Cancha Sintética de Fútbol</option>
              <option value="Piscina y Asoleadero">Piscina y Asoleadero</option>
              <option value="Gimnasio Comunitario">Gimnasio Comunitario</option>
            </select>
          </div>

          <Input
            label="Fecha del Evento"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hora de Inicio"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="Hora de Fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Enviar Solicitud
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
