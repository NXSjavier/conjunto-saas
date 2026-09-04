import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { Building2, Plus, Edit2, Trash2, Power, Copy, Check, ExternalLink } from 'lucide-react';

import { generateComplexCode, copyToClipboard, formatDate } from '../../../lib/utils';

export const ComplexesView = () => {
  const { complexes, createComplex, updateComplex, deleteComplex, toggleComplexStatus, changeComplexPlan } = useData();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingComplex, setEditingComplex] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [plan, setPlan] = useState('pro');
  const [code, setCode] = useState('');

  const handleOpenCreate = () => {
    setName('');
    setAddress('');
    setPlan('pro');
    setCode(generateComplexCode('Residencial'));
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createComplex({
      name: name.trim(),
      address: address.trim(),
      code: code.trim() || generateComplexCode(name),
      plan,
      status: 'active',
      subscription_status: 'active',
    });
    setIsCreateModalOpen(false);
  };

  const handleCopy = async (cCode) => {
    await copyToClipboard(cCode);
    setCopiedCode(cCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conjuntos Residenciales"
        subtitle="Administra los condominios, códigos de acceso y configuraciones de plan SaaS."
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Registrar Conjunto
          </Button>
        }
      />

      {complexes.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No hay conjuntos registrados"
          description="Comienza creando tu primer condominio o conjunto residencial para habilitar el SaaS."
          action={<Button onClick={handleOpenCreate}>Crear Conjunto</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complexes.map((c) => (
            <Card key={c.id} hoverEffect className="flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-100">{c.name}</h4>
                      <p className="text-xs text-slate-400">{c.address || 'Sin dirección registrada'}</p>
                    </div>
                  </div>
                </div>

                {/* Access Code Box */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Código de Acceso</span>
                    <span className="font-mono text-sm font-bold text-emerald-400 tracking-wider">{c.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode === c.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'} size="sm">
                      {c.plan.toUpperCase()}
                    </Badge>
                    <Badge variant={c.status === 'active' ? 'emerald' : 'rose'} size="sm" dot>
                      {c.status === 'active' ? 'Activo' : 'Bloqueado'}
                    </Badge>
                  </div>
                  <span className="text-slate-500 text-[11px]">{formatDate(c.created_at)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Power className="w-3.5 h-3.5" />}
                  onClick={() => toggleComplexStatus(c.id)}
                  className={c.status === 'active' ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}
                >
                  {c.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextPlan = c.plan === 'free' ? 'pro' : c.plan === 'pro' ? 'enterprise' : 'free';
                      changeComplexPlan(c.id, nextPlan);
                    }}
                  >
                    Cambiar Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      if (confirm(`¿Eliminar definitivamente "${c.name}" y todos sus datos?`)) {
                        deleteComplex(c.id);
                      }
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Registrar Nuevo Conjunto Residencial"
        description="Ingresa los datos para registrar un condominio o edificio en la plataforma."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Nombre del Conjunto"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCode(generateComplexCode(e.target.value));
            }}
            placeholder="Ej: Conjunto Residencial Los Pinos"
            required
          />
          <Input
            label="Dirección Principal"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle 100 #15-20, Bogotá"
          />
          <Input
            label="Código Único de Registro"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helperText="Este código será compartido con residentes para su registro inmediato."
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Plan SaaS Inicial
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="free">Gratuito ($0 / 30 días - 50 apartamentos)</option>
              <option value="pro">Pro ($30 / mes - 200 apartamentos)</option>
              <option value="enterprise">Enterprise ($100 / mes - capacidad ampliada)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Conjunto</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
