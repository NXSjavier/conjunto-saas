import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Search,
  KeyRound,
  MapPin,
  Phone,
  CheckCircle2,
  Shield,
  Users,
  Home,
  Check,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { FlashMessage } from '../../ui/FlashMessage';
import { formatDateOnly, generateComplexCode } from '../../../lib/utils';
import { PlanType, ResidentialComplex } from '../../../types';

export const ComplexesView: React.FC = () => {
  const { complexes, users, apartments, guards, createComplex, deleteComplex, changeComplexPlan, toggleComplexStatus } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanComplex, setEditingPlanComplex] = useState<ResidentialComplex | null>(null);
  const [newSelectedPlan, setNewSelectedPlan] = useState<PlanType>('pro');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('Medellín');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<PlanType>('pro');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const filteredComplexes = complexes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFlash({ message: 'Ingresa el nombre del conjunto residencial', type: 'error' });
      return;
    }

    const newC = createComplex({
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      plan,
    });

    setFlash({
      message: `Conjunto "${newC.name}" creado con éxito. Código asignado: ${newC.code}`,
      type: 'success',
    });

    setName('');
    setAddress('');
    setPhone('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: number, cName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el conjunto "${cName}" y todas sus dependencias?`)) {
      deleteComplex(id);
      setFlash({ message: `Conjunto "${cName}" eliminado`, type: 'info' });
    }
  };

  const handleSavePlanChange = () => {
    if (!editingPlanComplex) return;
    changeComplexPlan(editingPlanComplex.id, newSelectedPlan);
    setFlash({
      message: `Plan del conjunto "${editingPlanComplex.name}" actualizado a ${newSelectedPlan.toUpperCase()}`,
      type: 'success',
    });
    setEditingPlanComplex(null);
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Conjuntos Residenciales Registrados"
        subtitle="Control total como Super Admin: creación, gestión de planes (Free, Pro, Enterprise), estados y conteo de usuarios en tiempo real"
        badge={<Badge variant="purple">{complexes.length} condominios</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            className="bg-purple-600 hover:bg-purple-700 font-bold"
          >
            Nuevo Conjunto
          </Button>
        }
      />

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código o ciudad..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filteredComplexes.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-7 w-7 text-purple-600" />}
          title="No se encontraron conjuntos"
          description="Crea un nuevo conjunto para inicializar su código y período de prueba."
          actionLabel="Crear Conjunto"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComplexes.map((c) => {
            // Conteo real de usuarios por conjunto
            const complexUsers = users.filter((u) => u.residential_complex_id === c.id || u.requested_complex_id === c.id);
            const totalResidents = complexUsers.filter((u) => u.role === 'resident').length;
            const totalGuards = complexUsers.filter((u) => u.role === 'guard').length;
            const totalAdmins = complexUsers.filter((u) => u.role === 'admin').length;
            const totalApts = apartments.filter((a) => a.residential_complex_id === c.id).length;

            return (
              <Card key={c.id} className="relative group flex flex-col justify-between hover:border-purple-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                        <p className="text-[11px] text-slate-500">{c.city} - {c.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPlanComplex(c);
                          setNewSelectedPlan(c.plan);
                        }}
                        className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        title="Cambiar Plan"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        title="Eliminar conjunto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Datos Clave */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Código de Registro:</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {c.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Plan Actual:</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'}>
                          {c.plan.toUpperCase()}
                        </Badge>
                        <button
                          onClick={() => {
                            setEditingPlanComplex(c);
                            setNewSelectedPlan(c.plan);
                          }}
                          className="text-[10px] text-purple-600 hover:underline font-bold"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Suscripción:</span>
                      <Badge variant={c.subscription_status === 'active' ? 'emerald' : c.subscription_status === 'trial' ? 'sky' : 'rose'}>
                        {c.subscription_status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Desglose de Usuarios Totales por Conjunto */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                        Usuarios Totales en este Conjunto ({complexUsers.length}):
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Admin</span>
                          <span className="text-xs font-bold text-slate-900">{totalAdmins}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Residentes</span>
                          <span className="text-xs font-bold text-sky-700">{totalResidents}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">Guardias</span>
                          <span className="text-xs font-bold text-amber-700">{totalGuards}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Alta: {formatDateOnly(c.created_at)}</span>
                  <span className="font-semibold text-slate-700">
                    Vence: {c.current_period_end ? formatDateOnly(c.current_period_end) : '—'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Change Plan */}
      <Modal
        isOpen={Boolean(editingPlanComplex)}
        onClose={() => setEditingPlanComplex(null)}
        title="Modificar Plan SaaS del Conjunto"
        subtitle={`Cambiar asignación de plan para "${editingPlanComplex?.name}"`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Seleccione el plan que desea asignar. Los límites de departamentos y guardias se actualizarán de inmediato.
          </p>

          <div className="space-y-2">
            {[
              { id: 'free', label: 'Plan Free', desc: 'Prueba gratuita • Hasta 50 deptos • 2 guardias' },
              { id: 'pro', label: 'Plan Pro ($24 USD/mes)', desc: 'Recomendado • Hasta 200 deptos • 5 guardias' },
              { id: 'enterprise', label: 'Plan Enterprise ($49 USD/mes)', desc: 'Ilimitado • Sin restricciones' },
            ].map((p) => (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  newSelectedPlan === p.id
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-100'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="planSelect"
                  value={p.id}
                  checked={newSelectedPlan === p.id}
                  onChange={() => setNewSelectedPlan(p.id as PlanType)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{p.label}</span>
                  <span className="text-[11px] text-slate-500">{p.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingPlanComplex(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSavePlanChange}
              className="bg-purple-600 hover:bg-purple-700 font-bold"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Create Complex */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Conjunto Residencial"
        subtitle="Se generará un código único LP-YYYY-XXXX y 30 días de prueba gratuita"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre del Conjunto o Condominio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Conjunto Campestre Los Robles"
            icon={<Building2 className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ciudad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej: Bogotá o Medellín"
              required
            />
            <Input
              label="Teléfono Administración"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </div>

          <Input
            label="Dirección Física"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle 45 # 12-34"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Plan Inicial
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanType)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-purple-200 focus:outline-none"
            >
              <option value="free">Free (30 días de prueba - 50 Deptos)</option>
              <option value="pro">Pro ($24 USD/mes - 200 Deptos)</option>
              <option value="enterprise">Enterprise ($49 USD/mes - Ilimitado)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold">
              Crear Conjunto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
