import React, { useState } from 'react';
import { Users, Search, Phone, Mail, Home, Building2, UserPlus, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { formatDateOnly } from '../../../lib/utils';

export const ResidentsDirectoryView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { users } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const complexId = currentComplex?.id || 1;
  const residents = users.filter(
    (u) => u.residential_complex_id === complexId && u.role === 'resident'
  );

  const filteredResidents = residents.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.apartment_number && r.apartment_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.phone && r.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Residentes"
        subtitle={`Listado oficial de copropietarios y habitantes en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="sky">{residents.length} registrados</Badge>}
      />

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o departamento..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filteredResidents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-sky-600" />}
          title="No se encontraron residentes"
          description="Ajusta los términos de búsqueda o aprueba solicitudes pendientes de ingreso."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map((res) => (
            <Card key={res.id} className="relative">
              <div className="flex items-start gap-3.5">
                <img
                  src={
                    res.face_photo_path ||
                    res.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                  }
                  alt={res.name}
                  className="h-12 w-12 rounded-2xl object-cover border-2 border-slate-200 shrink-0 shadow-xs"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-slate-900 truncate">{res.name}</h3>
                    <Badge variant={res.status === 'active' ? 'emerald' : 'amber'}>
                      {res.status === 'active' ? 'Activo' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 truncate">
                      <Home className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{res.apartment_number || 'Apto sin asignar'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{res.email}</span>
                    </div>

                    {res.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{res.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>Registrado: {formatDateOnly(res.created_at)}</span>
                <span className="font-mono text-slate-500">ID: {res.id.slice(0, 10)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
