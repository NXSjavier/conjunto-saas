import React, { useState } from 'react';
import { Users, Search, Phone, Home, Mail, Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';

export const GuardDirectoryView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { users } = useData();

  const [searchQuery, setSearchQuery] = useState('');

  const complexId = currentComplex?.id || 1;
  const residents = users.filter(
    (u) => u.residential_complex_id === complexId && u.role === 'resident' && u.status === 'active'
  );

  const filteredResidents = residents.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.apartment_number && r.apartment_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.phone && r.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio Telefónico de Garita"
        subtitle={`Consulta inmediata de contactos de residentes en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="amber">{residents.length} contactos</Badge>}
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por departamento (Ej: 101, Torre A) o nombre..."
            icon={<Search className="h-4 w-4" />}
            autoFocus
          />
        </div>
      </div>

      {filteredResidents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-amber-600" />}
          title="No se encontraron residentes"
          description="Verifica el número de departamento o nombre ingresado."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map((res) => (
            <Card key={res.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                    <Home className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block truncate">
                      {res.apartment_number || 'Apto'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{res.name}</h4>
                  </div>
                </div>

                <Badge variant="emerald">Activo</Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                {res.phone ? (
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-semibold">
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{res.phone}</span>
                    </div>
                    <a
                      href={`tel:${res.phone}`}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                    >
                      Llamar
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">Sin teléfono registrado</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
