import React from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { PageHeader } from '../../ui/PageHeader';
import { EmptyState } from '../../ui/EmptyState';
import { History, User, FileText } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const formatAction = (action) => {
  if (!action) return '-';
  return action.replace(/_/g, ' ');
};

export const AuditsView = () => {
  const { audits, users } = useData();

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : 'Sistema';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Auditoría"
        subtitle="Historial completo de acciones realizadas en el conjunto residencial."
        badge={<Badge variant="slate" size="sm">{audits.length} registros</Badge>}
      />

      {audits.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="Sin registros de auditoría"
          description="Las acciones realizadas en el sistema se registrarán aquí automáticamente."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Acción</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Entidad</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-200 font-medium truncate">
                          {audit.user_name || getUserName(audit.user_id)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="indigo" size="sm">
                        {formatAction(audit.action)}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-slate-400 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-slate-500" />
                        {audit.entity || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-500">{formatDate(audit.created_at)}</td>
                    <td className="py-3 px-5 text-slate-400 hidden md:table-cell">
                      {audit.details && (
                        <span className="line-clamp-1">{audit.details}</span>
                      )}
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
