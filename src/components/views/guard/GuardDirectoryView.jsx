import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/PageHeader';
import {
  BookOpen,
  Search,
  User,
  Phone,
  Building,
  Mail,
  Users,
} from 'lucide-react';

export const GuardDirectoryView = ({ onNavigate }) => {
  const { users, apartments } = useData();

  const [searchTerm, setSearchTerm] = useState('');

  const residents = useMemo(() => {
    return users.filter((u) => u.role === 'resident' && u.status === 'active');
  }, [users]);

  const filteredResidents = useMemo(() => {
    if (!searchTerm.trim()) return residents;
    const term = searchTerm.toLowerCase();
    return residents.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(term)) ||
        (r.apartment && r.apartment.toLowerCase().includes(term)) ||
        (r.email && r.email.toLowerCase().includes(term))
    );
  }, [residents, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio Telefónico"
        subtitle="Lista de residentes del conjunto con información de contacto"
        actions={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('guard_dashboard')}>
            Volver al Panel
          </Button>
        }
      />

      {/* Search */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apartamento o email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            />
          </div>
          <Badge variant="sky">
            {filteredResidents.length} residentes
          </Badge>
        </div>
      </Card>

      {/* Residents Grid */}
      {filteredResidents.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchTerm ? 'No se encontraron residentes con ese criterio.' : 'No hay residentes registrados.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map((resident) => (
            <div
              key={resident.id}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                {resident.face_photo ? (
                  <img
                    src={resident.face_photo}
                    alt={resident.name}
                    className="w-12 h-12 rounded-full object-cover border border-sky-500/40"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 shrink-0">
                    {resident.name ? resident.name.substring(0, 2).toUpperCase() : '??'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-200 truncate">
                    {resident.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                    <Building className="w-3 h-3 shrink-0" />
                    <span className="truncate">{resident.apartment || 'Sin asignar'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/50 space-y-1.5">
                {resident.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="truncate">{resident.phone}</span>
                  </div>
                )}
                {resident.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{resident.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
