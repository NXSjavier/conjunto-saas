import React, { useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { Calendar, Clock3, Plus } from 'lucide-react';
import { formatDateOnly } from '../../../lib/utils';

const SLOT_OPTIONS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export const ResidentReservationsView = () => {
  const { currentUser, currentComplex } = useAuth();
  const { reservations, createReservation } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [resDate, setResDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const myReservations = reservations.filter((r) => r.resident_id === currentUser?.id);
  const plan = currentComplex?.plan || 'free';

  const calendarDays = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      });
    }
    return dates;
  }, []);

  const getOverlapCount = (date, area, start, end) => {
    if (!date || !area || !start || !end) return 0;
    return reservations.filter((r) => {
      if (!r.reservation_date || !r.area_name || r.status === 'rejected' || r.status === 'cancelled') return false;
      if (r.area_name.toLowerCase() !== area.toLowerCase()) return false;
      if (r.reservation_date !== date) return false;
      const currentStart = Number(String(r.start_time).replace(':', ''));
      const currentEnd = Number(String(r.end_time).replace(':', ''));
      const targetStart = Number(String(start).replace(':', ''));
      const targetEnd = Number(String(end).replace(':', ''));
      return !(targetEnd <= currentStart || targetStart >= currentEnd);
    }).length;
  };

  const hasActiveFreePlanLock = () => {
    return plan === 'free' && reservations.some((r) => r.status === 'pending' || r.status === 'approved');
  };

  const getPlanText = () => {
    if (plan === 'free') return '1 reserva activa por área y horario';
    if (plan === 'pro') return 'Hasta 3 reservas activas por área y horario';
    return 'Sin límite por horario, con bloqueo si hay conflicto real';
  };

  const getReservationStatus = (date, area, start, end) => {
    if (!date || !area || !start || !end) {
      return { label: 'Selecciona', tone: 'slate', waitText: '' };
    }

    const overlapCount = getOverlapCount(date, area, start, end);
    const freePlanLocked = plan === 'free' && hasActiveFreePlanLock();
    const busy =
      freePlanLocked ||
      (plan === 'pro' && overlapCount >= 3) ||
      (plan === 'enterprise' && overlapCount >= 1);

    let waitText = '';
    if (busy) {
      if (freePlanLocked) {
        waitText = 'El plan gratuito solo permite 1 reserva activa. Espera hasta 1 día o hasta que se libere la reserva actual.';
      } else if (reservations.length > 0) {
        const matching = reservations.filter((r) => {
          if (!r.reservation_date || !r.area_name || r.status === 'rejected' || r.status === 'cancelled') return false;
          if (r.area_name.toLowerCase() !== area.toLowerCase()) return false;
          if (r.reservation_date !== date) return false;
          const currentStart = Number(String(r.start_time).replace(':', ''));
          const currentEnd = Number(String(r.end_time).replace(':', ''));
          const targetStart = Number(String(start).replace(':', ''));
          const targetEnd = Number(String(end).replace(':', ''));
          return !(targetEnd <= currentStart || targetStart >= currentEnd);
        });

        if (matching.length > 0) {
          waitText = 'Este horario ya está ocupado. Espera hasta 1 día o elige otra franja disponible.';
        }
      }
    }

    return {
      label: busy ? 'Ocupado' : 'Libre',
      tone: busy ? 'rose' : 'emerald',
      waitText,
    };
  };

  const statusVariant = (s) => ({ pending: 'amber', approved: 'emerald', rejected: 'rose', cancelled: 'slate' }[s] || 'slate');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim() || !resDate || !startTime || !endTime) return;

    const overlapCount = getOverlapCount(resDate, areaName.trim(), startTime, endTime);
    if (plan === 'free' && (hasActiveFreePlanLock() || overlapCount >= 1)) {
      setNotice('El plan gratuito solo permite 1 reserva activa. Espera hasta 1 día o hasta que se libere la reserva actual.');
      return;
    }
    if (plan === 'pro' && overlapCount >= 3) {
      setNotice('Este horario ya tiene 3 reservas activas. Elige otra franja o comparte la disponibilidad con el administrador.');
      return;
    }
    if (plan === 'enterprise' && overlapCount >= 1) {
      setNotice('Ese horario ya está ocupado para esa área. Elige otro día o cambia la hora para continuar.');
      return;
    }

    setNotice('');
    setIsSubmitting(true);
    const result = await createReservation({
      area_name: areaName.trim(),
      reservation_date: resDate,
      start_time: startTime,
      end_time: endTime,
    });

    setIsSubmitting(false);
    if (result?.success) {
      setAreaName('');
      setResDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      setIsModalOpen(false);
      setNotice('');
      return;
    }

    setNotice(result?.message || 'No se pudo registrar la reserva.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Reservas"
        subtitle="Reserva áreas comunes del conjunto"
        action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>Nueva Reserva</Button>}
      />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan actual</p>
            <h3 className="text-lg font-bold text-slate-100">{currentComplex?.plan?.toUpperCase() || 'FREE'}</h3>
          </div>
          <Badge variant={plan === 'enterprise' ? 'purple' : plan === 'pro' ? 'emerald' : 'slate'} size="sm">
            {getPlanText()}
          </Badge>
        </div>
      </Card>

      {myReservations.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="No tienes reservas"
          description="Crea tu primera reserva para un área común."
          action={<Button onClick={() => setIsModalOpen(true)}>Reservar Ahora</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myReservations.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-100 text-sm">{r.area_name}</h4>
                <Badge variant={statusVariant(r.status)} size="sm">{r.status.toUpperCase()}</Badge>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>Fecha: {formatDateOnly(r.reservation_date)}</p>
                <p>Hora: {r.start_time} - {r.end_time}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Reserva de Área Común">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Área / Zona"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Ej: Quincho, Piscina, Salón"
            required
          />

          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Calendario</label>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => setResDate(day.value)}
                  className={`rounded-xl border px-2 py-2 text-xs transition ${
                    resDate === day.value
                      ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold">{day.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Input label="Fecha" type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} required />

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Horarios disponibles</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SLOT_OPTIONS.map((slot) => {
                const slotBusy =
                  areaName.trim() && resDate && (
                    (plan === 'free' && hasActiveFreePlanLock()) ||
                    (plan === 'free' && getOverlapCount(resDate, areaName.trim(), slot, `${String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:00`) >= 1) ||
                    (plan === 'pro' && getOverlapCount(resDate, areaName.trim(), slot, `${String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:00`) >= 3) ||
                    (plan === 'enterprise' && getOverlapCount(resDate, areaName.trim(), slot, `${String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:00`) >= 1)
                  );

                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => {
                      setStartTime(slot);
                      setEndTime(`${String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:00`);
                    }}
                    className={`rounded-xl border px-2 py-2 text-xs ${
                      startTime === slot
                        ? slotBusy
                          ? 'border-rose-400 bg-rose-500/10 text-rose-200'
                          : 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                        : slotBusy
                          ? 'border-rose-700 bg-rose-900/20 text-rose-200 hover:border-rose-500'
                          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{slot}</span>
                      <span className="text-[10px] font-semibold uppercase">{slotBusy ? 'Ocupado' : 'Libre'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Hora Inicio" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            <Input label="Hora Fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>

          {resDate && areaName.trim() && startTime && endTime && (() => {
            const status = getReservationStatus(resDate, areaName.trim(), startTime, endTime);
            return (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <Clock3 className="w-4 h-4 text-cyan-300" />
                  Disponibilidad
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2">
                  <span className="text-slate-300">Estado</span>
                  <Badge variant={status.tone} size="sm">
                    {status.label}
                  </Badge>
                </div>

                <p className="mt-2">
                  {getOverlapCount(resDate, areaName.trim(), startTime, endTime)} reservas activas para este horario en {areaName.trim() || 'esta área'}.
                </p>

                {status.waitText && (
                  <p className="mt-2 text-amber-200 font-medium">{status.waitText}</p>
                )}

                {!status.waitText && status.label === 'Libre' && (
                  <p className="mt-2 text-emerald-200 font-medium">Disponible ahora.</p>
                )}

                <p className="mt-1 text-slate-400">
                  Regla del plan: {getPlanText()}.
                </p>
              </div>
            );
          })()}

          {notice && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {notice}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); setNotice(''); }}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>Reservar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
