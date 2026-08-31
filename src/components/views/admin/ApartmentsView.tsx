import React, { useState } from 'react';
import { Home, Plus, Trash2, Edit2, Search, Building2, User, CheckCircle2 } from 'lucide-react';
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
import { Apartment, PLAN_LIMITS } from '../../../types';

export const ApartmentsView: React.FC = () => {
  const { currentComplex } = useAuth();
  const {
    apartments,
    blocks,
    createApartment,
    updateApartmentStatus,
    deleteApartment,
    checkResourceLimit,
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aptNumber, setAptNumber] = useState('');
  const [aptFloor, setAptFloor] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | undefined>(undefined);
  const [filterBlockId, setFilterBlockId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const complexId = currentComplex?.id || 1;
  const complexApts = apartments.filter((a) => a.residential_complex_id === complexId);
  const complexBlocks = blocks.filter((b) => b.residential_complex_id === complexId);

  const planConfig = currentComplex ? PLAN_LIMITS[currentComplex.plan] : PLAN_LIMITS.pro;
  const canAddMore = checkResourceLimit(complexId, 'apartments');

  // Filter apartments
  const filteredApartments = complexApts.filter((apt) => {
    const matchesBlock = filterBlockId === 'all' || apt.apartment_block_id === Number(filterBlockId);
    const matchesSearch =
      apt.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.block_name && apt.block_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (apt.resident_name && apt.resident_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBlock && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptNumber.trim()) {
      setFlash({ message: 'Ingresa el número o identificador del departamento', type: 'error' });
      return;
    }

    const res = createApartment({
      blockId: selectedBlockId,
      number: aptNumber,
      floor: aptFloor,
    });

    if (res.success) {
      setFlash({ message: `Departamento "${aptNumber}" creado exitosamente`, type: 'success' });
      setAptNumber('');
      setAptFloor('');
      setSelectedBlockId(undefined);
      setIsModalOpen(false);
    } else {
      setFlash({ message: res.message || 'Error al crear departamento', type: 'error' });
    }
  };

  const handleStatusChange = (id: number, newStatus: Apartment['status']) => {
    updateApartmentStatus(id, newStatus);
    setFlash({ message: 'Estado del departamento actualizado', type: 'info' });
  };

  const handleDelete = (id: number, num: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el departamento ${num}?`)) {
      deleteApartment(id);
      setFlash({ message: `Departamento ${num} eliminado`, type: 'info' });
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
        title="Gestión de Departamentos"
        subtitle={`Administración de unidades residenciales (${complexApts.length}/${planConfig.maxApartments === -1 ? 'Ilimitados' : planConfig.maxApartments} utilizados)`}
        badge={<Badge variant="emerald">{complexApts.length} unidades</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            disabled={!canAddMore}
          >
            Nuevo Departamento
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar depto, torre o residente..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Filtrar Torre:</span>
          <select
            value={filterBlockId}
            onChange={(e) => setFilterBlockId(e.target.value)}
            className="w-full sm:w-48 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
            <option value="all">Todas las torres ({complexApts.length})</option>
            {complexBlocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredApartments.length === 0 ? (
        <EmptyState
          icon={<Home className="h-7 w-7 text-emerald-600" />}
          title="No se encontraron departamentos"
          description="Crea departamentos o ajusta tus filtros de búsqueda para visualizar las unidades."
          actionLabel={canAddMore ? 'Crear Departamento' : undefined}
          onAction={canAddMore ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApartments.map((apt) => {
            const colors = statusColor(apt.status);
            return (
              <Card key={apt.id} className="relative group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                        {apt.number}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Depto {apt.number}</h4>
                        <p className="text-[11px] text-slate-500">
                          {apt.block_name || 'Torre General'} {apt.floor ? `• Piso ${apt.floor}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(apt.id, apt.number)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                      title="Eliminar departamento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Residente asignado */}
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Residente / Titular:
                    </span>
                    {apt.resident_name ? (
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                        <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{apt.resident_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Sin residente asignado</span>
                    )}
                  </div>
                </div>

                {/* Status Switcher Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {statusLabel(apt.status)}
                  </span>

                  <select
                    value={apt.status}
                    onChange={(e) => handleStatusChange(apt.id, e.target.value as Apartment['status'])}
                    className="text-[11px] font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="available">Disponible</option>
                    <option value="occupied">Ocupado</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Create Apartment */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Departamento"
        subtitle={`Complejo: ${currentComplex?.name || 'Las Praderas'}`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Torre o Manzana Perteneciente
            </label>
            <select
              value={selectedBlockId || ''}
              onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              <option value="">Selecciona una torre (Opcional)</option>
              {complexBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Número / Identificador"
              value={aptNumber}
              onChange={(e) => setAptNumber(e.target.value)}
              placeholder="Ej: 301 o Casa 4"
              icon={<Home className="h-4 w-4" />}
              required
            />
            <Input
              label="Piso (Opcional)"
              value={aptFloor}
              onChange={(e) => setAptFloor(e.target.value)}
              placeholder="Ej: 3"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Guardar Departamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
