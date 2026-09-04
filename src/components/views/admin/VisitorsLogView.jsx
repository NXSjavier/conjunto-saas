import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { Input } from '../../ui/Input';
import { EmptyState } from '../../ui/EmptyState';
import { QrCode, Search, ArrowRight } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'registered', label: 'Registradas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'in', label: 'Ingreso' },
  { value: 'out', label: 'Salida' },
  { value: 'rejected', label: 'Rechazadas' },
];

const STATUS_COLORS = {
  registered: 'sky',
  confirmed: 'emerald',
  in: 'purple',
  out: 'slate',
  rejected: 'rose',
};

const STATUS_LABELS = {
  registered: 'Registrada',
  confirmed: 'Confirmada',
  in: 'Ingreso',
  out: 'Salida',
  rejected: 'Rechazada',
};

export const VisitorsLogView = () => {
  const { visitors } = useData();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    let result = visitors;
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(
        (v) =>
          v.code.toLowerCase().includes(term) ||
          v.visitor_name.toLowerCase().includes(term) ||
          v.resident_name.toLowerCase().includes(term) ||
          (v.destination_apartment && v.destination_apartment.toLowerCase().includes(term))
      );
    }
    return result;
  }, [visitors, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Visitas"
        subtitle="Registro completo de ingresos y salidas de visitantes al conjunto."
        badge={<Badge variant="purple" size="sm">{visitors.length} registros</Badge>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por código, visitante, residente o destino..."
            icon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-transparent text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<QrCode className="w-8 h-8" />}
          title="No hay registros de visitas"
          description="Las visitas se registrarán cuando los residentes generen pases de acceso."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Visitante</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Destino</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Residente</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-5">
                      <span className="font-mono font-bold text-emerald-400">{v.code}</span>
                    </td>
                    <td className="py-3 px-5 text-slate-200 font-medium">{v.visitor_name}</td>
                    <td className="py-3 px-5 text-slate-400 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        {v.destination_apartment || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-400 hidden md:table-cell">{v.resident_name}</td>
                    <td className="py-3 px-5">
                      <Badge variant={STATUS_COLORS[v.status] || 'slate'} size="sm">
                        {STATUS_LABELS[v.status] || v.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-slate-500 hidden lg:table-cell">{formatDate(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
