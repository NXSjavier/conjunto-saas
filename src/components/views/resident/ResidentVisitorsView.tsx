import React, { useState } from 'react';
import { QrCode, Plus, Copy, CheckCircle2, User, Phone, FileText, Clock, ShieldCheck } from 'lucide-react';
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
import { copyToClipboard, statusColor, statusLabel, formatDate } from '../../../lib/utils';
import { soundEngine } from '../../../lib/sound';
import { Visitor } from '../../../types';

export const ResidentVisitorsView: React.FC = () => {
  const { currentUser, currentComplex } = useAuth();
  const { visitors, createVisitorPass } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [newlyCreatedVisitor, setNewlyCreatedVisitor] = useState<Visitor | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const myVisitors = visitors.filter((v) => v.created_by === currentUser?.id);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      setFlash({ message: 'Ingresa el nombre del visitante', type: 'error' });
      return;
    }

    const newPass = createVisitorPass({
      name: visitorName,
      documentNumber: docNumber,
      phone,
      visitingName: currentUser?.name || 'Residente',
      apartmentNumber: currentUser?.apartment_number || 'Apto',
    });

    soundEngine.playSuccessChime();
    setNewlyCreatedVisitor(newPass);
    setVisitorName('');
    setDocNumber('');
    setPhone('');
    setIsModalOpen(false);
    setFlash({ message: `Pase generado exitosamente. Código: ${newPass.code}`, type: 'success' });
  };

  const handleCopy = async (id: number, code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedId(id);
      soundEngine.playSuccessChime();
      setTimeout(() => setCopiedId(null), 2500);
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
        title="Pases de Visitas e Invitaciones"
        subtitle="Genera códigos de acceso rápido para tus familiares, amigos y repartidores"
        badge={<Badge variant="sky">{myVisitors.length} pases</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Nuevo Pase de Visita
          </Button>
        }
      />

      {/* Newly Created Banner Modal / Card */}
      {newlyCreatedVisitor && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/40 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                ¡Pase Creado con Éxito!
              </span>
              <h3 className="text-lg font-bold mt-0.5">Visitante: {newlyCreatedVisitor.name}</h3>
              <p className="text-xs text-slate-300 mt-1">
                Comparte este código de 8 dígitos para que el guardia lo verifique en garita.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-black/40 border border-emerald-500/50 p-3 rounded-2xl">
              <span className="font-mono text-2xl font-extrabold tracking-widest text-emerald-400">
                {newlyCreatedVisitor.code}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCopy(newlyCreatedVisitor.id, newlyCreatedVisitor.code)}
                icon={<Copy className="h-4 w-4" />}
              >
                Copiar
              </Button>
            </div>
          </div>
        </div>
      )}

      {myVisitors.length === 0 ? (
        <EmptyState
          icon={<QrCode className="h-7 w-7 text-sky-600" />}
          title="No has generado pases de visitas"
          description="Crea un pase antes de que llegue tu invitado para agilizar su ingreso por la garita de seguridad."
          actionLabel="Generar Primer Pase"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myVisitors.map((vis) => {
            const colors = statusColor(vis.status);
            const isCopied = copiedId === vis.id;

            return (
              <Card key={vis.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{vis.name}</h4>
                      <span className="text-[11px] text-slate-500">
                        {vis.document_number ? `Doc: ${vis.document_number}` : 'Sin cédula'}
                      </span>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {statusLabel(vis.status)}
                    </span>
                  </div>

                  {/* Code box */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Código:</span>
                      <span className="font-mono text-sm font-bold text-emerald-700 tracking-wider">
                        {vis.code}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(vis.id, vis.code)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copiar código"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[10px]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Generado: {formatDate(vis.created_at)}</span>
                    </div>
                    {vis.check_in_at && (
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Ingreso: {formatDate(vis.check_in_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 text-right">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Garita Principal • {currentComplex?.name || 'Las Praderas'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Create Visitor Pass */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generar Nuevo Pase de Visita"
        subtitle="Crea un código seguro de 8 caracteres para autorizar el ingreso"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre Completo del Visitante"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Ej: Laura Gómez"
            icon={<User className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cédula / Documento (Opcional)"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Ej: 1020304050"
              icon={<FileText className="h-4 w-4" />}
            />
            <Input
              label="Teléfono Móvil (Opcional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 000 0000"
              icon={<Phone className="h-4 w-4" />}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Generar Código de Pase
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
