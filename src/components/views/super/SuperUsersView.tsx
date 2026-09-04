import React, { useState } from 'react';
import {
  Users,
  Search,
  Trash2,
  AlertTriangle,
  Building2,
  Home,
  ShieldCheck,
  FileText,
  Download,
  AlertOctagon,
  CheckCircle2,
  Mail,
  Phone,
  Filter,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { FlashMessage } from '../../ui/FlashMessage';
import { formatDateOnly } from '../../../lib/utils';
import { User, RoleSlug } from '../../../types';

export const SuperUsersView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    users,
    complexes,
    apartments,
    incidents,
    reservations,
    visitors,
    purgeUserAccountCascading,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [complexFilter, setComplexFilter] = useState<string>('all');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Deletion Modal State
  const [userToPurge, setUserToPurge] = useState<User | null>(null);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [lastPurgedSummary, setLastPurgedSummary] = useState<{
    userName: string;
    pdfDownloaded: boolean;
  } | null>(null);

  // Filter users (excluding super admin oneself from accidental delete prompt)
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.apartment_number && u.apartment_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesComplex =
      complexFilter === 'all' ||
      (u.residential_complex_id && u.residential_complex_id.toString() === complexFilter);

    return matchesSearch && matchesRole && matchesComplex;
  });

  // Calculate dependency stats for user
  const getUserDependencies = (targetUser: User) => {
    const targetAptNumber = targetUser.apartment_number?.trim().toLowerCase();
    const userApts = apartments.filter((a) => {
      if (targetUser.apartment_id && a.id === targetUser.apartment_id) return true;
      if (
        targetAptNumber &&
        a.residential_complex_id === targetUser.residential_complex_id &&
        a.number.trim().toLowerCase() === targetAptNumber
      ) {
        return true;
      }
      if (a.resident_name && a.resident_name.trim().toLowerCase() === targetUser.name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    const userIncidents = incidents.filter(
      (inc) => inc.reported_by === targetUser.id || inc.reporter_name === targetUser.name
    );
    const userReservations = reservations.filter(
      (res) => res.user_id === targetUser.id || res.userName === targetUser.name
    );
    const userVisitors = visitors.filter(
      (vis) =>
        vis.visiting_user_id === targetUser.id ||
        (targetAptNumber && vis.apartment_number?.trim().toLowerCase() === targetAptNumber)
    );

    return {
      apartmentsCount: userApts.length,
      apartmentsDetails: userApts.map((a) => `${a.block_name || 'Bloque'} - Apto ${a.number}`).join(', '),
      incidentsCount: userIncidents.length,
      reservationsCount: userReservations.length,
      visitorsCount: userVisitors.length,
    };
  };

  const handleOpenPurgeModal = (user: User) => {
    if (user.role === 'super_admin') {
      setFlash({
        message: 'No es posible purgar la cuenta principal de Super Admin.',
        type: 'error',
      });
      return;
    }
    setUserToPurge(user);
    setConfirmEmailInput('');
  };

  const handleExecutePurge = () => {
    if (!userToPurge) return;

    if (confirmEmailInput.trim().toLowerCase() !== userToPurge.email.trim().toLowerCase()) {
      setFlash({
        message: 'El correo ingresado no coincide con la cuenta a purgar. Verifica por seguridad.',
        type: 'error',
      });
      return;
    }

    setIsPurging(true);
    const result = purgeUserAccountCascading(userToPurge.id, { downloadPdf: true });
    setIsPurging(false);

    if (result.success) {
      setLastPurgedSummary({
        userName: userToPurge.name,
        pdfDownloaded: true,
      });
      setFlash({
        message: result.message || 'Cuenta y dependencias borradas exitosamente de la base de datos.',
        type: 'success',
      });
      setUserToPurge(null);
      setConfirmEmailInput('');
    } else {
      setFlash({
        message: result.message || 'Error al ejecutar la purga.',
        type: 'error',
      });
    }
  };

  const getRoleBadgeVariant = (role?: RoleSlug) => {
    switch (role) {
      case 'super_admin':
        return 'purple' as const;
      case 'admin':
        return 'emerald' as const;
      case 'resident':
        return 'sky' as const;
      case 'guard':
        return 'amber' as const;
      default:
        return 'slate' as const;
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
        title="Gestión Global de Usuarios & Purga de Cuentas"
        subtitle="Administra todas las cuentas de la plataforma y ejecuta el borrado definitivo en cascada con certificación PDF de auditoría."
        badge={
          <Badge variant="purple">
            {users.length} cuentas registradas
          </Badge>
        }
      />

      {/* Security notice alert banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Protocolo de Borrado Seguro & Auditoría Automática
              <Badge variant="rose">Super Admin Exclusivo</Badge>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Al purgar una cuenta, el sistema borra de raíz sus credenciales, viviendas/departamentos asignados, reportes, reservas y pases de visita, generando inmediatamente un Certificado PDF de Seguridad.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and search toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
        <div className="flex-1 max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar usuario por nombre, email o departamento..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los Roles</option>
            <option value="resident">Residentes</option>
            <option value="admin">Administradores</option>
            <option value="guard">Guardias</option>
            <option value="super_admin">Super Admins</option>
          </select>

          {/* Complex Filter */}
          <select
            value={complexFilter}
            onChange={(e) => setComplexFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los Conjuntos</option>
            {complexes.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table / Grid */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-purple-600" />}
          title="No se encontraron cuentas"
          description="Ajusta los filtros de búsqueda o el rol seleccionado."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const complex = complexes.find((c) => c.id === user.residential_complex_id);
            const isSuperAdmin = user.role === 'super_admin';
            const deps = getUserDependencies(user);

            return (
              <Card key={user.id} className="relative flex flex-col justify-between hover:border-purple-200 transition-all">
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          user.avatar ||
                          user.face_photo_path ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                        }
                        alt={user.name}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-xs"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{user.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role ? user.role.toUpperCase() : 'RESIDENTE'}
                          </Badge>
                          <Badge variant={user.status === 'active' ? 'emerald' : 'amber'}>
                            {user.status === 'active' ? 'Activo' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Delete action button */}
                    {!isSuperAdmin && (
                      <button
                        onClick={() => handleOpenPurgeModal(user)}
                        title="Borrar de la base de datos con Certificado PDF"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span className="truncate font-medium text-slate-800">
                        {complex ? `${complex.name}` : 'Sin conjunto asignado'}
                      </span>
                    </div>

                    {user.apartment_number && (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <Home className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Inmueble: {user.apartment_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Cascading dependencies preview */}
                  {!isSuperAdmin && (
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
                      <span>Viviendas vinculadas: <b>{deps.apartmentsCount}</b></span>
                      <span>Incidencias/Pases: <b>{deps.incidentsCount + deps.visitorsCount}</b></span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Alta: {formatDateOnly(user.created_at)}
                  </span>

                  {!isSuperAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPurgeModal(user)}
                      className="text-[11px] py-1 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold"
                      icon={<Trash2 className="h-3 w-3" />}
                    >
                      Borrar Cuenta + PDF
                    </Button>
                  ) : (
                    <span className="text-[10px] font-bold text-purple-600">Cuenta Protegida</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: PURGE USER WITH CONFIRMATION & AUDIT PDF GENERATION */}
      {userToPurge && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isPurging) setUserToPurge(null);
          }}
          title="Borrado Definitivo y Purga en Cascada (Super Admin)"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertOctagon className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">
                  ¿Deseas purgar permanentemente esta cuenta y su vivienda?
                </h4>
                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  Esta acción es <b>irreversible</b>. Se eliminará la cuenta del usuario de la base de datos junto con su vivienda asignada, reservas, visitas, pases de seguridad y registros.
                </p>
              </div>
            </div>

            {/* Target Account Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Usuario a eliminar:</span>
                <span className="font-bold text-slate-900">{userToPurge.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Correo Electrónico:</span>
                <span className="font-mono text-slate-800">{userToPurge.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rol:</span>
                <Badge variant={getRoleBadgeVariant(userToPurge.role)}>
                  {(userToPurge.role || 'resident').toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inmueble / Apto:</span>
                <span className="font-bold text-emerald-800">
                  {userToPurge.apartment_number || 'Ninguno'}
                </span>
              </div>
            </div>

            {/* Safety Confirmation Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Para confirmar, escribe el correo electrónico de la cuenta:
              </label>
              <Input
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                placeholder={userToPurge.email}
                className="font-mono text-xs border-rose-300 focus:ring-rose-500"
              />
            </div>

            {/* PDF generation banner */}
            <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-800">
              <FileText className="h-4 w-4 text-purple-600 shrink-0" />
              <span>
                Se generará y descargará automáticamente un <b>Certificado de Auditoría y Purga en PDF</b>.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserToPurge(null)}
                disabled={isPurging}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecutePurge}
                disabled={
                  isPurging ||
                  confirmEmailInput.trim().toLowerCase() !== userToPurge.email.trim().toLowerCase()
                }
                icon={<Trash2 className="h-4 w-4" />}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isPurging ? 'Purgando y generando PDF...' : 'Confirmar Borrado Total'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
