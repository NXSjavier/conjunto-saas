import React, { useState } from 'react';
import {
  Users,
  Search,
  Mail,
  Building2,
  Phone,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  User as UserIcon,
  FileText,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { FlashMessage } from '../../ui/FlashMessage';
import { formatDateOnly } from '../../../lib/utils';
import { User } from '../../../types';

export const AdminsView: React.FC = () => {
  const { users, complexes, createAdmin, deleteAdmin, purgeUserAccountCascading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create admin modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [complexId, setComplexId] = useState<number>(complexes[0]?.id || 1);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete admin modal state
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadPdfCert, setDownloadPdfCert] = useState(true);

  const admins = users.filter((u) => u.role === 'admin');

  const filteredAdmins = admins.filter((adm) => {
    const complex = complexes.find((c) => c.id === adm.residential_complex_id);
    const complexName = complex?.name || '';
    return (
      adm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complexName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFlash({ message: 'El nombre y correo son obligatorios', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const res = createAdmin({
      name,
      email,
      phone,
      complexId,
      password: password || 'admin123',
    });
    setIsSubmitting(false);

    if (res.success) {
      setFlash({ message: 'Administrador creado y asignado al conjunto exitosamente', type: 'success' });
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setIsCreateModalOpen(false);
    } else {
      setFlash({ message: res.message || 'Error al crear administrador', type: 'error' });
    }
  };

  const handleDeleteAdmin = () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    const res = purgeUserAccountCascading(adminToDelete.id, { downloadPdf: downloadPdfCert });
    setIsDeleting(false);

    if (res.success) {
      setFlash({
        message: `Administrador ${adminToDelete.name} eliminado permanentemente de la base de datos.${downloadPdfCert ? ' Se descargó el Certificado de Auditoría PDF.' : ''}`,
        type: 'success',
      });
      setAdminToDelete(null);
    } else {
      setFlash({ message: res.message || 'Error al eliminar administrador', type: 'error' });
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
        title="Directorio de Administradores de Conjuntos"
        subtitle="Gestión y control de las cuentas de administradores asignados a cada condominio"
        badge={<Badge variant="purple">{admins.length} administradores</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Nuevo Administrador
          </Button>
        }
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o conjunto..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filteredAdmins.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-purple-600" />}
          title="No se encontraron administradores"
          description="Crea un nuevo administrador o verifica los términos de búsqueda."
          actionLabel="Crear Primer Administrador"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map((adm) => {
            const complex = complexes.find((c) => c.id === adm.residential_complex_id);
            return (
              <Card key={adm.id} className="relative group">
                <div className="flex items-start justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <img
                      src={adm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={adm.name}
                      className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{adm.name}</h4>
                        <Badge variant="emerald">Admin</Badge>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/60 truncate">
                          <Building2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                          <span className="truncate">{complex?.name || 'Conjunto sin asignar'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{adm.email}</span>
                        </div>

                        {adm.phone && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{adm.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Super Admin Delete Button */}
                  <button
                    onClick={() => setAdminToDelete(adm)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                    title="Eliminar este administrador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Alta: {formatDateOnly(adm.created_at)}</span>
                  <span className="font-mono text-emerald-700 font-bold">{complex?.code || '—'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Administrador de Conjunto"
        size="md"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Conjunto Residencial Asignado
            </label>
            <select
              value={complexId}
              onChange={(e) => setComplexId(Number(e.target.value))}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              required
            >
              {complexes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city}) - Código: {c.code}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nombre Completo del Administrador"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Laura Gómez"
            icon={<UserIcon className="h-4 w-4" />}
            required
          />

          <Input
            label="Correo Electrónico (Login)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin.laura@conjunto.com"
            icon={<Mail className="h-4 w-4" />}
            required
          />

          <Input
            label="Teléfono Móvil"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
            icon={<Phone className="h-4 w-4" />}
          />

          <Input
            label="Contraseña Inicial"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dejar en blanco para usar 'admin123'"
            icon={<Lock className="h-4 w-4" />}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              icon={<Plus className="h-4 w-4" />}
            >
              Crear Administrador
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        title="Confirmar Eliminación de Administrador"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Acción irreversible</p>
              <p className="text-[11px] text-rose-700">
                Se eliminará la cuenta del administrador <strong>{adminToDelete?.name}</strong> ({adminToDelete?.email}) del sistema.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            ¿Estás seguro de que deseas eliminar permanentemente a este administrador? Se borrará de la base de datos y se desvinculará del conjunto.
          </p>

          <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={downloadPdfCert}
              onChange={(e) => setDownloadPdfCert(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="h-3.5 w-3.5 text-rose-600" />
              Generar y descargar Certificado de Auditoría y Purga en PDF
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdminToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={handleDeleteAdmin}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
