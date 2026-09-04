import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { UserCheck, CheckCircle2, XCircle, Phone, Mail, Home, Eye } from 'lucide-react';

import { formatDate } from '../../../lib/utils';

export const PendingResidentsView = () => {
  const { users, approveResident, rejectResident } = useData();
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignedApartment, setAssignedApartment] = useState('');

  const pendingUsers = users.filter((u) => u.status === 'pending');

  const handleOpenApprove = (user) => {
    setSelectedUser(user);
    setAssignedApartment(user.apartment || '');
  };

  const handleConfirmApprove = async () => {
    if (!selectedUser) return;
    await approveResident(selectedUser.id, assignedApartment.trim() || undefined);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprobación de Solicitudes de Residentes"
        subtitle="Verifica la identidad, fotografía facial y unidad habitacional antes de conceder acceso al sistema."
      />

      {pendingUsers.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-8 h-8" />}
          title="Bandeja de solicitudes al día"
          description="No hay residentes pendientes de aprobación en este momento. Todas las solicitudes han sido gestionadas."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pendingUsers.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {p.face_photo ? (
                    <img
                      src={p.face_photo}
                      alt={p.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-base text-slate-300 border border-slate-700">
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-slate-100 truncate">{p.name}</h4>
                    <Badge variant="amber" size="sm" dot>
                      PENDIENTE
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unidad Solicitada: <strong className="text-white">{p.apartment || 'Por asignar'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">Solicitado: {formatDate(p.created_at)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      if (confirm(`¿Rechazar el acceso a ${p.name}?`)) {
                        rejectResident(p.id);
                      }
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleOpenApprove(p)}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Confirmar Aprobación de Residente"
        description="Asigna o rectifica el apartamento y confirma la habilitación de la cuenta."
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              {selectedUser.face_photo ? (
                <img src={selectedUser.face_photo} alt="Foto" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-200">
                  {selectedUser.name.substring(0, 2)}
                </div>
              )}
              <div>
                <h5 className="font-bold text-slate-100">{selectedUser.name}</h5>
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
              </div>
            </div>

            <Input
              label="Apartamento / Unidad Asignada"
              value={assignedApartment}
              onChange={(e) => setAssignedApartment(e.target.value)}
              placeholder="Ej: Torre 1 - Apt 304"
              helperText="El residente podrá generar pases de visita y reservas bajo esta unidad."
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmApprove}>
                Aprobar y Activar Cuenta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
