import React, { useState } from 'react';
import { Compass, Search, Clock, User, Shield, Tag, Filter } from 'lucide-react';
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

  const isSuper = currentUser?.role === 'super_admin';
  const complexId = currentComplex?.id || 1;

  const filteredAudits = audits
    .filter((a) => (isSuper ? true : a.residential_complex_id === complexId || !a.residential_complex_id))
    .filter(
      (a) =>
        a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.auditable_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Auditoría y Trazabilidad"
        subtitle={`Registro cronológico inmutable de cambios y actividades en ${isSuper ? 'la plataforma global' : currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="slate">{filteredAudits.length} eventos</Badge>}
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar acción, usuario o entidad afectada..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filteredAudits.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-7 w-7 text-slate-500" />}
          title="No hay registros de auditoría"
          description="Cada acción administrativa, pase de visitante y cambio de suscripción quedará registrado automáticamente aquí."
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Entidad</th>
                  <th className="py-3 px-4">Detalles / Modificaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredAudits.map((aud) => (
                  <tr key={aud.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(aud.created_at)}
                    </td>

                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                      {aud.user_name}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        {aud.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-sans">
                      {aud.auditable_type} {aud.auditable_id ? `#${aud.auditable_id}` : ''}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {aud.new_values ? JSON.stringify(aud.new_values) : '—'}
                    </td>
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
