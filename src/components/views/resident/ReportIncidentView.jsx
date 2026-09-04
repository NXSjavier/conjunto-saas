import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { AlertTriangle, Plus } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const ReportIncidentView = () => {
  const { currentUser } = useAuth();
  const { incidents, createIncident } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myIncidents = incidents.filter(i => i.reported_by === currentUser?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    await createIncident({ title: title.trim(), description: description.trim(), priority });
    setTitle(''); setDescription(''); setPriority('medium');
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const priorityVariant = (p) => ({ low: 'emerald', medium: 'amber', high: 'rose', urgent: 'rose' }[p] || 'slate');
  const statusVariant = (s) => ({ open: 'amber', in_progress: 'sky', resolved: 'emerald', closed: 'slate' }[s] || 'slate');

  return (
    <div className="space-y-6">
      <PageHeader title="Reportar Incidente" subtitle="Notifica un problema o situación que requiera atención" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>Nuevo Reporte</Button>} />
      {myIncidents.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="No has reportado incidentes" description="Si detectas un problema, repórtalo aquí para que la administración lo atienda." action={<Button onClick={() => setIsModalOpen(true)}>Reportar Ahora</Button>} />
      ) : (
        <div className="space-y-3">
          {myIncidents.map(i => (
            <Card key={i.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-100 text-sm">{i.title}</h4>
                  {i.description && <p className="text-xs text-slate-400">{i.description}</p>}
                  <p className="text-[10px] text-slate-500">{formatDate(i.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={priorityVariant(i.priority)} size="sm">{i.priority?.toUpperCase()}</Badge>
                  <Badge variant={statusVariant(i.status)} size="sm">{i.status?.toUpperCase()?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Reportar Nuevo Incidente">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título del Incidente" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Fuga de agua en pasillo" required />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el problema con detalle..." rows={3} className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Prioridad</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-emerald-500">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>Enviar Reporte</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
