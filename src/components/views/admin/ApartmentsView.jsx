import React, { useState, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { Building, Plus, Trash2, Users, UserCheck } from 'lucide-react';

export const ApartmentsView = () => {
  const {
    apartments,
    complexes,
    users,
    createApartment,
    updateApartmentStatus,
    deleteApartment,
    updateApartmentResident
  } = useData();
  const { currentComplex } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('1');

  const [selectedApartment, setSelectedApartment] = useState(null);
  const [selectedResidentId, setSelectedResidentId] = useState('');

  const getAvailableResidents = () => {
    const assignedResidentIds = apartments
      .filter((apt) => apt.resident_id)
      .map((apt) => apt.resident_id);
    return users.filter(
      (user) =>
        user.role === 'resident' &&
        user.complex_id === currentComplex?.id &&
        !assignedResidentIds.includes(user.id)
    );
  };

  useEffect(() => {
    if (currentComplex && isModalOpen) {
      setSelectedComplexId(currentComplex.id);
    }
  }, [currentComplex, isModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplexId || !number.trim()) {
      alert('Selecciona un conjunto y escribe el número del apartamento');
      return;
    }
    await createApartment({ number: number.trim(), floor: parseInt(floor) || 1 });
    setNumber('');
    setFloor('1');
    setSelectedComplexId(currentComplex?.id || '');
    setIsModalOpen(false);
  };

  const handleAssignResident = (apartment) => {
    setSelectedApartment(apartment);
    setSelectedResidentId(apartment.resident_id || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApartment || !selectedResidentId) {
      alert('Selecciona un residente');
      return;
    }
    await updateApartmentResident(selectedApartment.id, selectedResidentId);
    setIsAssignModalOpen(false);
    setSelectedApartment(null);
    setSelectedResidentId('');
  };

  const handleReleaseApartment = async (apartmentId) => {
    if (confirm('¿Liberar este apartamento? El residente quedará sin apartamento asignado.')) {
      await updateApartmentResident(apartmentId, null);
    }
  };

  const statusVariant = (s) => ({ available: 'emerald', occupied: 'sky', maintenance: 'amber' }[s] || 'slate');

  const handleOpenModal = () => {
    setSelectedComplexId(currentComplex?.id || '');
    setNumber('');
    setFloor('1');
    setIsModalOpen(true);
  };

  const getComplexName = (complexId) => {
    const complex = complexes.find((c) => c.id === complexId);
    return complex?.name || 'Sin conjunto';
  };

  const getResidentName = (residentId) => {
    const user = users.find((u) => u.id === residentId);
    return user?.name || 'Sin asignar';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Apartamentos"
        subtitle="Administra las unidades habitacionales del conjunto"
        action={
          <div className="flex gap-2">
            <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenModal}>
              Nuevo Apartamento
            </Button>
          </div>
        }
      />

      {apartments.length === 0 ? (
        <EmptyState
          icon={<Building className="w-8 h-8" />}
          title="No hay apartamentos registrados"
          description="Agrega apartamentos para comenzar."
        />
      ) : (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Número</th>
                  <th className="px-5 py-3.5">Conjunto</th>
                  <th className="px-5 py-3.5">Piso</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Residente</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {apartments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-100">{apt.number}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{getComplexName(apt.complex_id)}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{apt.floor}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(apt.status)} size="sm">{apt.status?.toUpperCase()}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {apt.resident_id ? (
                        <span className="text-emerald-400 font-medium">{getResidentName(apt.resident_id)}</span>
                      ) : (
                        'Vacío'
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Users className="w-3.5 h-3.5" />}
                          onClick={() => handleAssignResident(apt)}
                          className={apt.resident_id ? 'text-emerald-400' : 'text-slate-400'}
                        >
                          {apt.resident_id ? 'Cambiar' : 'Asignar'}
                        </Button>

                        {apt.resident_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<UserCheck className="w-3.5 h-3.5" />}
                            onClick={() => handleReleaseApartment(apt.id)}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            Liberar
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateApartmentStatus(
                              apt.id,
                              apt.status === 'available' ? 'occupied' : 'available'
                            )
                          }
                        >
                          {apt.status === 'available' ? 'Ocupar' : 'Liberar'}
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (confirm(`¿Eliminar el apartamento ${apt.number}?`)) {
                              deleteApartment(apt.id);
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear Apartamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Apartamento"
        description="Agrega una nueva unidad habitacional al conjunto"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conjunto Residencial
            </label>
            <select
              value={selectedComplexId}
              onChange={(e) => setSelectedComplexId(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            >
              <option value="">Selecciona un conjunto</option>
              {complexes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Número de Apartamento"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ej: 101, 2A, 304-B"
            required
          />

          <Input
            label="Piso"
            type="number"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Ej: 1, 2, 3"
            min="1"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedComplexId}>
              Guardar Apartamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Residente */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedApartment(null);
          setSelectedResidentId('');
        }}
        title="Asignar Residente a Apartamento"
        description={selectedApartment ? `Apartamento ${selectedApartment.number}` : ''}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seleccionar Residente
            </label>
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            >
              <option value="">Selecciona un residente</option>
              {getAvailableResidents().map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email} {user.apartment ? `(Apt: ${user.apartment})` : ''}
                </option>
              ))}
            </select>
            {getAvailableResidents().length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No hay residentes disponibles para asignar.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedApartment(null);
                setSelectedResidentId('');
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedResidentId}>
              Asignar Residente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
