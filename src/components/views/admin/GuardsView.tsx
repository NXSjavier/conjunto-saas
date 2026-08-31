import React, { useState } from 'react';
import { Shield, Plus, Trash2, Phone, Clock, User, AlertCircle } from 'lucide-react';
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
import { PLAN_LIMITS } from '../../../types';

export const GuardsView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { guards, createGuard, deleteGuard, checkResourceLimit } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('Turno Día (06:00 - 18:00)');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const complexId = currentComplex?.id || 1;
  const complexGuards = guards.filter((g) => g.residential_complex_id === complexId);
  const planConfig = currentComplex ? PLAN_LIMITS[currentComplex.plan] : PLAN_LIMITS.pro;
  const canAddMore = checkResourceLimit(complexId, 'guards');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFlash({ message: 'Por favor ingresa nombre y teléfono del guardia', type: 'error' });
      return;
    }

    const res = createGuard(name, phone, shift);
    if (res.success) {
      setFlash({ message: `Guardia "${name}" registrado exitosamente`, type: 'success' });
      setName('');
      setPhone('');
      setIsModalOpen(false);
    } else {
      setFlash({ message: res.message || 'Error al registrar guardia', type: 'error' });
    }
  };

  const handleDelete = (id: number, gName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro del guardia ${gName}?`)) {
      deleteGuard(id);
      setFlash({ message: `Guardia ${gName} eliminado`, type: 'info' });
    }
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Guardias de Seguridad y Garita"
        subtitle={`Personal de vigilancia asignado (${complexGuards.length}/${planConfig.maxGuards === -1 ? 'Ilimitados' : planConfig.maxGuards} en Plan ${planConfig.name})`}
        badge={<Badge variant="amber">{complexGuards.length} guardias</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            disabled={!canAddMore}
          >
            Nuevo Guardia
          </Button>
        }
      />

      {complexGuards.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-7 w-7 text-amber-600" />}
          title="No hay guardias de seguridad registrados"
          description="Registra al personal de garita para que puedan validar códigos de acceso en tiempo real con alertas sonoras."
          actionLabel={canAddMore ? 'Registrar Guardia' : undefined}
          onAction={canAddMore ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {complexGuards.map((guard) => (
            <Card key={guard.id} className="relative group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base shrink-0 border border-amber-200">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{guard.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60 mt-0.5">
                      Activo en garita
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(guard.id, guard.name)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  title="Eliminar guardia"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Teléfono: <strong>{guard.phone}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Turno: <strong>{guard.shift}</strong>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Create Guard */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nuevo Guardia"
        subtitle={`Complejo: ${currentComplex?.name || 'Las Praderas'}`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre Completo del Guardia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Carlos Mendoza"
            icon={<User className="h-4 w-4" />}
            required
          />

          <Input
            label="Teléfono Móvil o Radio"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 111 2233"
            icon={<Phone className="h-4 w-4" />}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Turno Asignado
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              <option value="Turno Día (06:00 - 18:00)">Turno Día (06:00 - 18:00)</option>
              <option value="Turno Noche (18:00 - 06:00)">Turno Noche (18:00 - 06:00)</option>
              <option value="Turno Rotativo 24/7">Turno Rotativo 24/7</option>
              <option value="Fines de Semana">Fines de Semana y Feriados</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Guardar Guardia
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
