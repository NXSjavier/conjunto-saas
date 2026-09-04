import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { EmptyState } from '../../ui/EmptyState';
import { Search, Users } from 'lucide-react';

export const ResidentsDirectoryView = () => {
  const { users } = useData();
  const { currentComplex } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const activeResidents = useMemo(() => {
    return users.filter(
      (u) => u.role === 'resident' && u.status === 'active' && u.complex_id === currentComplex?.id
    );
  }, [users, currentComplex]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return activeResidents;
    return activeResidents.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        (r.apartment && r.apartment.toLowerCase().includes(term))
    );
  }, [activeResidents, searchTerm]);

  const statusColors = {
    active: 'emerald',
    pending: 'amber',
    blocked: 'rose',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Residentes"
        subtitle={`Residentes activos en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="emerald" size="sm">{activeResidents.length} residentes</Badge>}
      />

      <Input
        placeholder="Buscar por nombre, email o apartamento..."
        icon={<Search className="w-4 h-4" />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={searchTerm ? 'Sin resultados' : 'No hay residentes activos'}
          description={
            searchTerm
              ? 'No se encontraron residentes con ese criterio de búsqueda.'
              : 'Aún no hay residentes aprobados en el conjunto.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resident) => (
            <Card key={resident.id} hoverEffect>
              <div className="flex items-start gap-3">
                {resident.face_photo ? (
                  <img
                    src={resident.face_photo}
                    alt={resident.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/30"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 border border-slate-700">
                    {resident.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-100 truncate">{resident.name}</h4>
                    <Badge variant={statusColors[resident.status] || 'slate'} size="sm">
                      {resident.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{resident.email}</p>
                  {resident.phone && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{resident.phone}</p>
                  )}
                  {resident.apartment && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                      Apt: {resident.apartment}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
