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
import { QrCode, Plus, Copy, Check, User } from 'lucide-react';

export const ResidentVisitorsView = () => {
  const { currentUser } = useAuth();
  const { visitors, createVisitorPass } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myVisitors = visitors.filter(v => v.resident_id === currentUser?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    setIsSubmitting(true);
    await createVisitorPass({ visitor_name: visitorName.trim(), purpose: purpose.trim() });
    setVisitorName('');
    setPurpose('');
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleCopy = async (code) => {
    try { await navigator.clipboard.writeText(code); } catch {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pases de Visitante" subtitle="Genera códigos únicos de acceso para tus visitantes" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>Nuevo Pase</Button>} />
      {myVisitors.length === 0 ? (
        <EmptyState icon={<QrCode className="w-8 h-8" />} title="No hay pases creados" description="Crea tu primer pase de visitante para generar un código de acceso." action={<Button onClick={() => setIsModalOpen(true)}>Crear Pase</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myVisitors.map(v => (
            <Card key={v.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-100 text-sm">{v.visitor_name}</span>
                </div>
                <Badge variant={v.status === 'in' ? 'emerald' : v.status === 'registered' ? 'amber' : 'slate'} size="sm">{v.status.toUpperCase()}</Badge>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Código de Acceso</p>
                  <p className="font-mono text-lg font-bold text-emerald-400 tracking-wider">{v.code}</p>
                </div>
                <button onClick={() => handleCopy(v.code)} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
                  {copiedCode === v.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {v.purpose && <p className="text-xs text-slate-400">Propósito: {v.purpose}</p>}
            </Card>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Pase de Visitante" description="Genera un código de acceso único para tu visitante.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Visitante" value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="Ej: Juan Pérez" required />
          <Input label="Propósito de la Visita" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Ej: Entrega de paquete" />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>Generar Código</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
