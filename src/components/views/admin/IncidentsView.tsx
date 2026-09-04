import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, Home, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { formatDate, statusColor, statusLabel } from '../../../lib/utils';
import { IncidentStatus } from '../../../types';

export const IncidentsView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { incidents, updateIncidentStatus } = useData();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const complexId = currentComplex?.id || 1;
  const complexIncidents = incidents.filter((i) => i.residential_complex_id === complexId);

  const filteredIncidents = complexIncidents.filter((inc) => {
    const matchesStatus = statusFilter === 'all' || inc.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || inc.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const handleStatusChange = (id: number, status: IncidentStatus) => {
    updateIncidentStatus(id, status);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Incidencias y Reportes"
        subtitle={`Seguimiento de novedades reportadas por residentes en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="amber">{complexIncidents.length} reportadas</Badge>}
      />

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abiertas (Pendientes)</option>
            <option value="in_progress">En Progreso</option>
            <option value="resolved">Resueltas</option>
            <option value="closed">Cerradas</option>
          </select>

          <span className="font-semibold text-slate-500 ml-2">Prioridad:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Todas las prioridades</option>
            <option value="high">Alta / Urgente</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredIncidents.length} resultado(s)
        </span>
      </div>

      {filteredIncidents.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="h-7 w-7 text-emerald-600" />}
          title="No hay incidencias que coincidan"
          description="Excelente: no se han reportado problemas en este momento o los filtros seleccionados no arrojaron resultados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidents.map((inc) => {
            const colors = statusColor(inc.status);
            return (
              <Card key={inc.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          inc.priority === 'high'
                            ? 'bg-rose-500 animate-pulse'
                            : inc.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <h3 className="text-sm font-bold text-slate-900">{inc.title}</h3>
                    </div>

                    <Badge
                      variant={
                        inc.priority === 'high' ? 'rose' : inc.priority === 'medium' ? 'amber' : 'slate'
                      }
                    >
                      {inc.priority.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {inc.description}
                  </p>

                  {/* Photo attachments */}
                  {inc.attachments && inc.attachments.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {inc.attachments.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Evidencia"
                          className="h-28 w-full object-cover rounded-xl border border-slate-200"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reporter info */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{inc.reporter_name}</span>
                      <span className="text-emerald-700 font-bold">({inc.reporter_apartment})</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(inc.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* State selector footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {statusLabel(inc.status)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Cambiar Estado:</span>
                    <select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value as IncidentStatus)}
                      className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="open">Abierta</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelta</option>
                      <option value="closed">Cerrada</option>
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
