import React, { useState } from 'react';
import { History, Search, QrCode, User, Home, Clock, Phone, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { statusColor, statusLabel, formatDate } from '../../../lib/utils';

export const VisitorsLogView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { visitors } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const complexId = currentComplex?.id || 1;
  const complexVisitors = visitors.filter((v) => v.residential_complex_id === complexId);

  const filteredVisitors = complexVisitors.filter((v) => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visiting_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.apartment_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Visitantes y Accesos"
        subtitle={`Registro completo de pases y validaciones en garita para ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="slate">{complexVisitors.length} registros</Badge>}
      />

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código XXXX-XXXX, visitante o apto..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Filtrar Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
            <option value="all">Todos ({complexVisitors.length})</option>
            <option value="registered">Registrado (Pendiente)</option>
            <option value="confirmed">Confirmado</option>
            <option value="in">Ingresado (Adentro)</option>
            <option value="out">Salida Registrada</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>

      {filteredVisitors.length === 0 ? (
        <EmptyState
          icon={<History className="h-7 w-7 text-slate-600" />}
          title="No se encontraron registros de visitas"
          description="Los pases generados por residentes y validados por los guardias se listarán automáticamente aquí."
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Código Pase</th>
                  <th className="py-3 px-4">Visitante</th>
                  <th className="py-3 px-4">Destino / Residente</th>
                  <th className="py-3 px-4">Doc / Teléfono</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Ingreso / Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((vis) => {
                  const colors = statusColor(vis.status);
                  return (
                    <tr key={vis.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 text-xs">
                          {vis.code}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {vis.name}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {vis.visiting_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Depto: {vis.apartment_number}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div>{vis.document_number || 'Sin documento'}</div>
                        <div className="text-[11px] text-slate-400">{vis.phone || '—'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {statusLabel(vis.status)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>In: {vis.check_in_at ? formatDate(vis.check_in_at) : '—'}</div>
                        <div>Out: {vis.check_out_at ? formatDate(vis.check_out_at) : '—'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
