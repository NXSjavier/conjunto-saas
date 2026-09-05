import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Users, Search, Trash2, Shield, User as UserIcon, ShieldAlert } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const SuperUsersView = () => {
  const { users, complexes, purgeUserAccountCascading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.apartment && u.apartment.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="purple" size="sm">SUPER ADMIN</Badge>;
      case 'admin':
        return <Badge variant="sky" size="sm">ADMIN</Badge>;
      case 'guard':
        return <Badge variant="amber" size="sm">GUARDA</Badge>;
      default:
        return <Badge variant="emerald" size="sm">RESIDENTE</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión Global de Usuarios y Purga"
        subtitle="Listado general con auditoría de seguridad y eliminación permanente en cascada (generación de certificado PDF)."
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nombre, correo o apartamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'super_admin', 'admin', 'resident', 'guard'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              {r === 'all' ? 'Todos' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Conjunto Asignado</th>
                <th className="px-5 py-3.5">Unidad / Teléfono</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acción de Seguridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs">
                    No se encontraron usuarios con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const complex = complexes.find((c) => c.id === u.complex_id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-5 py-4 text-xs text-slate-300">
                        {complex ? (
                          <div>
                            <div className="font-medium text-slate-200">{complex.name}</div>
                            <span className="font-mono text-[10px] text-slate-500">{complex.code}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Acceso Global (SaaS)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        <div>{u.apartment || 'Sin asignar'}</div>
                        <div className="text-[11px] text-slate-500">{u.phone || '—'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={u.status === 'active' ? 'emerald' : u.status === 'pending' ? 'amber' : 'rose'} size="sm">
                          {u.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {u.role !== 'super_admin' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => {
                              if (confirm(`¿Purga de seguridad para ${u.name} (${u.email})?\n\nEsta acción eliminará en cascada todas sus visitas, reservas y registros, liberará su apartamento y emitirá un certificado PDF de auditoría.`)) {
                                purgeUserAccountCascading(u.id);
                              }
                            }}
                          >
                            Purga en Cascada
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Protegido</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
