import React, { useState } from 'react';
import {
  Compass,
  Search,
  Clock,
  User,
  Shield,
  Tag,
  Filter,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { formatDate } from '../../../lib/utils';

export const AuditsView: React.FC = () => {
  const { currentComplex, currentUser } = useAuth();
  const { audits } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'seguridad' | 'visitas' | 'reservas' | 'residentes' | 'comunicados'>('all');

  const isSuper = currentUser?.role === 'super_admin';
  const complexId = currentComplex?.id || 1;

  // Filtrado estricto por conjunto: el admin solo ve los eventos de su conjunto residencial
  const complexAudits = audits.filter(
    (a) => isSuper || a.residential_complex_id === complexId || !a.residential_complex_id
  );

  const filteredAudits = complexAudits
    .filter((a) => {
      if (categoryFilter === 'all') return true;
      const act = (a.action || '').toLowerCase();
      const type = (a.auditable_type || '').toLowerCase();
      if (categoryFilter === 'seguridad') return type.includes('guard') || act.includes('guardia') || act.includes('bloqueo') || act.includes('ingreso');
      if (categoryFilter === 'visitas') return type.includes('visitor') || act.includes('visita') || act.includes('pase') || act.includes('garita');
      if (categoryFilter === 'reservas') return type.includes('reservation') || act.includes('reserva') || act.includes('área');
      if (categoryFilter === 'residentes') return type.includes('resident') || type.includes('user') || act.includes('residente') || act.includes('depto') || act.includes('bloque');
      if (categoryFilter === 'comunicados') return type.includes('announcement') || act.includes('comunicado') || act.includes('aviso');
      return true;
    })
    .filter((a) => {
      const q = searchQuery.toLowerCase();
      const actionText = (a.action || '').toLowerCase();
      const userName = (a.user_name || '').toLowerCase();
      const entity = (a.auditable_type || '').toLowerCase();
      const details = a.new_values ? JSON.stringify(a.new_values).toLowerCase() : '';
      return actionText.includes(q) || userName.includes(q) || entity.includes(q) || details.includes(q);
    });

  // Función para traducir y dar formato humano en lenguaje natural y claro
  const renderReadableAction = (action: string, type: string) => {
    const act = (action || '').toLowerCase();
    const ent = (type || '').toLowerCase();

    if (act.includes('create') || act.includes('crear') || act.includes('registro')) {
      return {
        label: 'Registro Nuevo',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeVariant: 'emerald' as const,
      };
    }
    if (act.includes('update') || act.includes('actualiz') || act.includes('editar') || act.includes('aprobar')) {
      return {
        label: 'Actualización / Aprobación',
        color: 'text-sky-700 bg-sky-50 border-sky-200',
        badgeVariant: 'sky' as const,
      };
    }
    if (act.includes('check_in') || act.includes('ingreso') || act.includes('entrada')) {
      return {
        label: 'Ingreso en Garita',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeVariant: 'emerald' as const,
      };
    }
    if (act.includes('check_out') || act.includes('salida')) {
      return {
        label: 'Salida de Visita',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeVariant: 'amber' as const,
      };
    }
    if (act.includes('delete') || act.includes('eliminar') || act.includes('rechazar')) {
      return {
        label: 'Eliminación / Rechazo',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badgeVariant: 'rose' as const,
      };
    }

    return {
      label: action,
      color: 'text-slate-700 bg-slate-50 border-slate-200',
      badgeVariant: 'slate' as const,
    };
  };

  const renderReadableDetails = (aud: any) => {
    if (!aud.new_values) return <span className="text-slate-400 italic">Sin observaciones adicionales</span>;
    const vals = aud.new_values;

    if (typeof vals === 'string') return <span>{vals}</span>;

    // Si tiene campos reconocibles, mostrarlos en oraciones limpias en español
    const parts: string[] = [];
    if (vals.name) parts.push(`Nombre: ${vals.name}`);
    if (vals.title) parts.push(`Título: "${vals.title}"`);
    if (vals.apartment_number) parts.push(`Departamento: ${vals.apartment_number}`);
    if (vals.area_name) parts.push(`Área: ${vals.area_name}`);
    if (vals.date) parts.push(`Fecha: ${vals.date}`);
    if (vals.visiting_name) parts.push(`Visitó a: ${vals.visiting_name}`);
    if (vals.status) parts.push(`Estado: ${vals.status}`);
    if (vals.priority) parts.push(`Prioridad: ${vals.priority}`);

    if (parts.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 items-center">
          {parts.map((p, i) => (
            <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
              {p}
            </span>
          ))}
        </div>
      );
    }

    return (
      <span className="text-slate-600 text-xs">
        {Object.entries(vals)
          .filter(([k]) => !['id', 'created_at', 'updated_at', 'residential_complex_id'].includes(k))
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(' • ') || 'Actividad registrada correctamente'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Auditoría del Conjunto"
        subtitle={`Registro detallado y cronológico de todas las actividades y cambios ocurridos en ${
          isSuper ? 'la plataforma global' : currentComplex?.name || 'su conjunto residencial'
        }`}
        badge={<Badge variant="slate">{filteredAudits.length} registros</Badge>}
      />

      {/* Barra de Búsqueda y Filtros de Categoría */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario, actividad o departamento..."
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'visitas', label: 'Visitas & Garita' },
              { id: 'reservas', label: 'Reservas' },
              { id: 'residentes', label: 'Residentes' },
              { id: 'comunicados', label: 'Comunicados' },
              { id: 'seguridad', label: 'Seguridad' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer text-xs ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredAudits.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-8 w-8 text-slate-400" />}
          title="No hay registros de auditoría en este filtro"
          description="Todas las acciones administrativas, aprobaciones de residentes, pases de visita en garita y reservas de áreas sociales quedarán registradas aquí con fecha y hora exacta."
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Responsable</th>
                  <th className="py-3.5 px-4">Actividad Realizada</th>
                  <th className="py-3.5 px-4">Módulo / Sección</th>
                  <th className="py-3.5 px-4">Detalles de la Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAudits.map((aud) => {
                  const actionStyle = renderReadableAction(aud.action, aud.auditable_type);
                  return (
                    <tr key={aud.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Fecha y hora */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(aud.created_at)}</span>
                        </div>
                      </td>

                      {/* Usuario responsable */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                            {(aud.user_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{aud.user_name || 'Sistema'}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {aud.user_role ? aud.user_role.toUpperCase() : 'USUARIO'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Acción legible */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg border text-xs ${actionStyle.color}`}>
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          {actionStyle.label}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <span className="capitalize">
                          {aud.auditable_type === 'visitor' ? 'Pases de Visita' :
                           aud.auditable_type === 'reservation' ? 'Reservas de Áreas' :
                           aud.auditable_type === 'incident' ? 'Incidencias' :
                           aud.auditable_type === 'announcement' ? 'Comunicados' :
                           aud.auditable_type === 'apartment' ? 'Departamentos' :
                           aud.auditable_type === 'guard' ? 'Garita / Guardias' :
                           aud.auditable_type === 'profile' || aud.auditable_type === 'user' ? 'Directorio Residentes' :
                           aud.auditable_type}
                        </span>
                      </td>

                      {/* Detalles claros en español */}
                      <td className="py-3.5 px-4 max-w-md">
                        {renderReadableDetails(aud)}
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
