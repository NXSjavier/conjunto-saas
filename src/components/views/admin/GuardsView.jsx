import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { Shield, Plus, Trash2, Copy, Check } from 'lucide-react';

export const GuardsView = () => {
  const { guards, createGuard, deleteGuard } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [createdGuard, setCreatedGuard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    const password = generatePassword();
    const result = await createGuard({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
    });
    if (result) {
      setCreatedGuard({ ...result, tempPassword: password });
      setTempPassword(password);
    }
    setName('');
    setEmail('');
    setPhone('');
    setSubmitting(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este guarda? No podrá iniciar sesión en la app.')) {
      await deleteGuard(id);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCreatedGuard(null);
    setTempPassword('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal de Portería"
        subtitle="Gestiona los guardas de seguridad autorizados para el control de acceso."
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Agregar Guarda
          </Button>
        }
      />

      {guards.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No hay guardas registrados"
          description="Agrega el personal de portería para habilitar el control de acceso al conjunto."
          action={<Button onClick={() => setIsModalOpen(true)}>Agregar Primer Guarda</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guards.map((guard) => (
            <Card key={guard.id} hoverEffect>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{guard.name}</h4>
                    {guard.email && (
                      <p className="text-xs text-slate-400 truncate">{guard.email}</p>
                    )}
                    {guard.phone && (
                      <p className="text-xs text-slate-500 truncate">{guard.phone}</p>
                    )}
                    <Badge variant="sky" size="sm" className="mt-1">Guarda</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDelete(guard.id)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Agregar Guarda */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Agregar Guarda de Seguridad"
        description="Registra un nuevo guarda. Se generará una contraseña temporal para su primer acceso."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Carlos Rodríguez"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
          />
          <Input
            label="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 310 123 4567"
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Crear Guarda
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Contraseña Temporal */}
      <Modal
        isOpen={!!createdGuard}
        onClose={() => { setCreatedGuard(null); setTempPassword(''); }}
        title="Guarda Creado Exitosamente"
        description="Comparte esta contraseña temporal con el guarda para su primer acceso."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">
              Contraseña Temporal
            </p>
            <div className="flex items-center gap-2">
              <code className="text-lg font-mono font-bold text-emerald-300 flex-1">{tempPassword}</code>
              <Button
                size="sm"
                variant="ghost"
                icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={copyPassword}
                className="text-emerald-400"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Email:</strong> {createdGuard?.email}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-300">Nombre:</strong> {createdGuard?.name}
            </p>
          </div>
          <p className="text-xs text-amber-400">
            El guarda debe usar este email y contraseña para iniciar sesión en la app. Se recomienda cambiar la contraseña después del primer acceso.
          </p>
          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button onClick={() => { setCreatedGuard(null); setTempPassword(''); }}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
