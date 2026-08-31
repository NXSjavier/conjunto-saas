import React, { useState } from 'react';
import { AlertTriangle, Plus, Paperclip, Clock, CheckCircle } from 'lucide-react';
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
import { statusColor, statusLabel, formatDate } from '../../../lib/utils';
import { Incident } from '../../../types';

export const ReportIncidentView: React.FC = () => {
  const { currentUser, currentComplex } = useAuth();
  const { incidents, createIncident } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Incident['priority']>('medium');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const myIncidents = incidents.filter((i) => i.reported_by === currentUser?.id);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFlash({ message: 'Por favor ingresa título y descripción', type: 'error' });
      return;
    }

    createIncident({
      title,
      description,
      priority,
      attachments: attachmentUrl.trim() ? [attachmentUrl.trim()] : undefined,
    });

    setFlash({ message: 'Incidencia reportada a la administración', type: 'success' });
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Reporte de Novedades e Incidencias"
        subtitle="Informa a la administración sobre daños, ruidos molestos o requerimientos de mantenimiento"
        badge={<Badge variant="amber">{myIncidents.length} reportes</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Reportar Incidencia
          </Button>
        }
      />

      {myIncidents.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7 text-amber-600" />}
          title="No tienes incidencias reportadas"
          description="Si experimentas problemas con áreas comunes, servicios o convivencia, repórtalo aquí para que el administrador le dé seguimiento."
          actionLabel="Crear Reporte"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myIncidents.map((inc) => {
            const colors = statusColor(inc.status);
            return (
              <Card key={inc.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{inc.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {statusLabel(inc.status)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {inc.description}
                  </p>

                  {inc.attachments && inc.attachments.length > 0 && (
                    <div className="mt-3">
                      <img
                        src={inc.attachments[0]}
                        alt="Evidencia"
                        className="h-28 w-full object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Prioridad: <strong className="uppercase text-slate-700">{inc.priority}</strong></span>
                  <span>{formatDate(inc.created_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Report Incident */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Reporte de Incidencia"
        subtitle="La administración recibirá una notificación inmediata"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Título de la Novedad"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Fuga de agua en pasillo piso 2"
            icon={<AlertTriangle className="h-4 w-4" />}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : p === 'medium'
                        ? 'bg-amber-50 border-amber-500 text-amber-700'
                        : 'bg-slate-100 border-slate-500 text-slate-800'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {p === 'high' ? 'Alta / Urgente' : p === 'medium' ? 'Media' : 'Baja'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción Detallada
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica qué sucedió, ubicación exacta y detalles relevantes..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>

          <Input
            label="Foto o Evidencia (URL Opcional)"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            icon={<Paperclip className="h-4 w-4" />}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Enviar Reporte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
