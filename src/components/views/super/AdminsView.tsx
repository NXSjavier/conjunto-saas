import React, { useState } from 'react';
import { Users, Search, Mail, Building2, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { formatDateOnly } from '../../../lib/utils';

export const AdminsView: React.FC = () => {
  const { users, complexes } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const admins = users.filter((u) => u.role === 'admin');

  const filteredAdmins = admins.filter((adm) => {
    const complex = complexes.find((c) => c.id === adm.residential_complex_id);
    const complexName = complex?.name || '';
    return (
      adm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complexName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Administradores de Conjuntos"
        subtitle="Cuentas responsables de la gestión operativa de cada condominio"
        badge={<Badge variant="purple">{admins.length} administradores</Badge>}
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o conjunto..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {filteredAdmins.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-purple-600" />}
          title="No se encontraron administradores"
          description="Verifica los términos de búsqueda ingresados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map((adm) => {
            const complex = complexes.find((c) => c.id === adm.residential_complex_id);
            return (
              <Card key={adm.id}>
                <div className="flex items-start gap-3.5">
                  <img
                    src={adm.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={adm.name}
                    className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{adm.name}</h4>
                      <Badge variant="emerald">Admin</Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/60 truncate">
                        <Building2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                        <span className="truncate">{complex?.name || 'Conjunto sin asignar'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{adm.email}</span>
                      </div>

                      {adm.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{adm.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Alta: {formatDateOnly(adm.created_at)}</span>
                  <span className="font-mono text-emerald-700 font-bold">{complex?.code || '—'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
