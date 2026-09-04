import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { EmptyState } from '../../ui/EmptyState';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const STATUS_TRANSITIONS = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

const STATUS_LABELS = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const STATUS_COLORS = {
  open: 'rose',
  in_progress: 'amber',
  resolved: 'emerald',
  closed: 'slate',
};

const PRIORITY_CONFIG = {
  low: { label: 'Baja', variant: 'emerald' },
  medium: { label: 'Media', variant: 'amber' },
  high: { label: 'Alta', variant: 'rose' },
  urgent: { label: 'Urgente', variant: 'rose', dot: true },
};

export const IncidentsView = () => {
  const { incidents, users, updateIncidentStatus } = useData();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return incidents;
    return incidents.filter((i) => i.status === statusFilter);
  }, [incidents, statusFilter]);

  const getReporterName = (reportedBy) => {
    const user = users.find((u) => u.id === reportedBy);
    return user ? user.name : 'Desconocido';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidencias y Reportes"
        subtitle="Gestiona las incidencias reportadas por los residentes del conjunto."
        badge={<Badge variant="amber" size="sm">{incidents.length} total</Badge>}
      />

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={statusFilter === opt.value ? 'primary' : 'outline'}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== 'all' && (
              <span className="ml-1 opacity-70">
                ({incidents.filter((i) => i.status === opt.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title={statusFilter !== 'all' ? 'Sin incidencias con ese filtro' : 'No hay incidencias reportadas'}
          description={
            statusFilter !== 'all'
              ? 'No se encontraron incidencias con el estado seleccionado.'
              : 'Los residentes pueden reportar incidencias desde su panel.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => {
            const priority = PRIORITY_CONFIG[incident.priority] || PRIORITY_CONFIG.low;
            const nextStatuses = STATUS_TRANSITIONS[incident.status] || [];

            return (
              <Card key={incident.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-100">{incident.title}</h4>
                      <Badge variant={priority.variant} size="sm" dot={priority.dot}>
                        {priority.label}
                      </Badge>
                      <Badge variant={STATUS_COLORS[incident.status] || 'slate'} size="sm">
                        {STATUS_LABELS[incident.status] || incident.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{incident.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Reportado por: <span className="text-slate-300 font-medium">{getReporterName(incident.reported_by)}</span></span>
                      {incident.apartment && <span>Apt: {incident.apartment}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(incident.created_at)}
                      </span>
                    </div>
                  </div>

                  {nextStatuses.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {nextStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={status === 'resolved' ? 'success' : status === 'closed' ? 'secondary' : 'outline'}
                          onClick={() => updateIncidentStatus(incident.id, status)}
                        >
                          {STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
