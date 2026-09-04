import React, { useState } from 'react';
import { UserCheck, Check, X, Maximize2, Building2, Mail, Phone, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { formatDate } from '../../../lib/utils';
import { User } from '../../../types';
import { soundEngine } from '../../../lib/sound';

export const PendingResidentsView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { users, approveResident, rejectResident } = useData();

  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [assignApartmentNumber, setAssignApartmentNumber] = useState('');

  const complexId = currentComplex?.id || 1;
  const pendingUsers = users.filter(
    (u) => u.requested_complex_id === complexId && u.status === 'pending'
  );

  const handleOpenApproveModal = (user: User) => {
    setSelectedUserForModal(user);
    setAssignApartmentNumber(user.requested_block_or_apt || 'Torre A - 101');
  };

  const handleConfirmApprove = () => {
    if (!selectedUserForModal || !assignApartmentNumber.trim()) return;
    approveResident(selectedUserForModal.id, assignApartmentNumber.trim());
    soundEngine.playSuccessChime();
    setSelectedUserForModal(null);
  };

  const handleReject = (userId: string) => {
    if (window.confirm('¿Estás seguro de rechazar y eliminar esta solicitud de registro?')) {
      rejectResident(userId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprobar Residentes Pendientes"
        subtitle={`Solicitudes de ingreso sin código para ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="amber">{pendingUsers.length} pendientes</Badge>}
      />

      {pendingUsers.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-7 w-7 text-emerald-600" />}
          title="No hay residentes pendientes de aprobación"
          description="Todas las solicitudes de registro sin código han sido verificadas. Cuando nuevos usuarios envíen su foto de rostro, aparecerán aquí."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id} className="relative overflow-hidden">
              <div className="flex items-start gap-4">
                {/* Face photo with tap to zoom */}
                <div
                  onClick={() => setZoomPhotoUrl(user.face_photo_path || null)}
                  className="relative h-20 w-20 rounded-2xl bg-slate-100 border-2 border-emerald-500/40 overflow-hidden shrink-0 cursor-pointer group shadow-sm"
                  title="Toca para ampliar foto"
                >
                  {user.face_photo_path ? (
                    <img
                      src={user.face_photo_path}
                      alt={user.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <UserCheck className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                    <Badge variant="amber" dot>
                      Pendiente
                    </Badge>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold truncate bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Solicita: {user.requested_block_or_apt || 'Sin especificar'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{formatDate(user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(user.id)}
                  className="text-rose-600 hover:bg-rose-50 border-slate-200"
                  icon={<X className="h-3.5 w-3.5" />}
                >
                  Rechazar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenApproveModal(user)}
                  icon={<Check className="h-3.5 w-3.5" />}
                >
                  Aprobar y Asignar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal to Confirm Approval and Apartment Assignment */}
      <Modal
        isOpen={Boolean(selectedUserForModal)}
        onClose={() => setSelectedUserForModal(null)}
        title="Aprobar Residente"
        subtitle="Confirma los datos y asigna la unidad habitacional"
      >
        {selectedUserForModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              {selectedUserForModal.face_photo_path && (
                <img
                  src={selectedUserForModal.face_photo_path}
                  alt={selectedUserForModal.name}
                  className="h-12 w-12 rounded-xl object-cover border border-slate-300"
                />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedUserForModal.name}</h4>
                <p className="text-xs text-slate-500">{selectedUserForModal.email}</p>
              </div>
            </div>

            <Input
              label="Torre / Bloque y N° Departamento a Asignar"
              value={assignApartmentNumber}
              onChange={(e) => setAssignApartmentNumber(e.target.value)}
              placeholder="Ej: Torre B - 204 o Manzana 23 Casa 12"
              icon={<Building2 className="h-4 w-4" />}
              helperText="El residente tendrá acceso a reservas y pases de visitas con este departamento."
              required
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUserForModal(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmApprove}>
                Confirmar Aprobación
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Zoom Face Photo */}
      <Modal
        isOpen={Boolean(zoomPhotoUrl)}
        onClose={() => setZoomPhotoUrl(null)}
        title="Foto de Rostro para Identificación"
      >
        {zoomPhotoUrl && (
          <div className="flex flex-col items-center">
            <img
              src={zoomPhotoUrl}
              alt="Foto ampliada"
              className="w-full max-h-[70vh] object-contain rounded-2xl border border-slate-200 shadow-md"
            />
            <p className="text-xs text-slate-500 mt-3 text-center">
              Foto de alta resolución registrada para verificación de acceso en garita.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
