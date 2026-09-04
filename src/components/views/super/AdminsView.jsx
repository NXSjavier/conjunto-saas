import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { ShieldCheck, Plus, Building2, Mail, Phone, Trash2 } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const AdminsView = () => {
  const { users, complexes, createAdmin, purgeUserAccountCascading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [complexId, setComplexId] = useState('');

  const adminUsers = users.filter((u) => u.role === 'admin');

  const handleOpenModal = () => {
    setName('');
    setEmail('');
    setPassword('admin123');
    setPhone('');
    setComplexId(complexes[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !complexId) return;
    await createAdmin({
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || 'admin123',
      complex_id: complexId,
      phone: phone.trim(),
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administradores de Conjunto"
        subtitle="Cuentas con permisos de administración delegada por conjunto residencial."
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenModal}>
            Nuevo Administrador
          </Button>
        }
      />

      {adminUsers.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title="No hay administradores asignados"
          description="Crea administradores para que puedan gestionar residentes, guardas y avisos en sus respectivos conjuntos."
          action={<Button onClick={handleOpenModal}>Asignar Administrador</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {adminUsers.map((admin) => {
            const complex = complexes.find((c) => c.id === admin.complex_id);
            return (
              <Card key={admin.id} hoverEffect className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-100">{admin.name}</h4>
                        <span className="text-xs text-purple-400 font-medium">Administrador Delegado</span>
                      </div>
                    </div>
                    <Badge variant={admin.status === 'active' ? 'emerald' : 'rose'} size="sm">
                      {admin.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-medium">{complex?.name || 'Conjunto sin asignar'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                    {admin.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{admin.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Alta: {formatDate(admin.created_at)}</span>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      if (confirm(`¿Purga de seguridad para "${admin.name}"? Se generará certificado PDF.`)) {
                        purgeUserAccountCascading(admin.id);
                      }
                    }}
                  >
                    Purgar Cuenta
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Administrador de Conjunto"
        description="Genera credenciales de acceso para un encargado de conjunto residencial."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Carlos Mendoza"
            required
          />
          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@condominio.com"
            required
          />
          <Input
            label="Contraseña Inicial"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin123"
          />
          <Input
            label="Teléfono de Contacto"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conjunto Residencial Asignado
            </label>
            <select
              value={complexId}
              onChange={(e) => setComplexId(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500"
              required
            >
              <option value="">Selecciona un conjunto...</option>
              {complexes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Administrador</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
