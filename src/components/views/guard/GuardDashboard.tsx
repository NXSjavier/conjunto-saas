import React from 'react';
import {
  Shield,
  QrCode,
  Users,
  LogIn,
  LogOut,
  CheckCircle,
  History,
  Phone,
  Search,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { QuickActions } from '../../ui/QuickActions';
import { statusColor, statusLabel, formatDate } from '../../../lib/utils';

export interface GuardDashboardProps {
  onNavigate: (view: string) => void;
}

export const GuardDashboard: React.FC<GuardDashboardProps> = ({ onNavigate }) => {
  const { currentComplex } = useAuth();
  const { visitors, users } = useData();

  const complexId = currentComplex?.id || 1;
  const complexVisitors = visitors.filter((v) => v.residential_complex_id === complexId);
  const complexResidents = users.filter(
    (u) => u.residential_complex_id === complexId && u.role === 'resident'
  );

  const visitorsInside = complexVisitors.filter((v) => v.status === 'in');
  const todayPasses = complexVisitors.filter((v) => v.status === 'registered' || v.status === 'confirmed');

  const guardActions = [
    {
      id: 'gq-validate',
      label: 'Validar Código de Pase',
      description: 'Ingresar código XXXX-XXXX con alerta sonora',
      icon: <QrCode className="h-5 w-5" />,
      variant: 'emerald' as const,
      onClick: () => onNavigate('guard_validator'),
    },
    {
      id: 'gq-directory',
      label: 'Directorio de Contacto',
      description: 'Buscar teléfono de residentes por departamento',
      icon: <Users className="h-5 w-5" />,
      variant: 'sky' as const,
      onClick: () => onNavigate('guard_directory'),
    },
    {
      id: 'gq-history',
      label: 'Registro de Garita',
      description: 'Ver historial de ingresos y salidas del turno',
      icon: <History className="h-5 w-5" />,
      variant: 'amber' as const,
      onClick: () => onNavigate('guard_validator'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Guard Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Puesto de Control Garita</h1>
            <Badge variant="amber">Turno Activo</Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {currentComplex?.name || 'Las Praderas'} • Monitoreo de accesos y visitantes autorizados
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => onNavigate('guard_validator')}
          icon={<QrCode className="h-4 w-4" />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          Validar Código Visita
        </Button>
      </div>

      {/* StatCards (Section 4.3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pases Activos Hoy"
          value={todayPasses.length}
          icon={<QrCode className="h-5 w-5" />}
          variant="blue"
          onClick={() => onNavigate('guard_validator')}
        />
        <StatCard
          label="Visitantes Adentro"
          value={visitorsInside.length}
          icon={<LogIn className="h-5 w-5" />}
          variant={visitorsInside.length > 0 ? 'amber' : 'slate'}
          trend={visitorsInside.length > 0 ? 'En el recinto' : '0 adentro'}
          onClick={() => onNavigate('guard_validator')}
        />
        <StatCard
          label="Residentes en Directorio"
          value={complexResidents.length}
          icon={<Users className="h-5 w-5" />}
          variant="emerald"
          onClick={() => onNavigate('guard_directory')}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions
        title="Operaciones Rápidas de Garita"
        actions={guardActions}
        columns={3}
      />

      {/* Today's Recent Passes */}
      <Card
        title="Pases Programados para el Turno"
        subtitle="Verifica el código antes de permitir el ingreso vehicular o peatonal"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 px-2">Código</th>
                <th className="pb-3 px-2">Visitante</th>
                <th className="pb-3 px-2">Residente / Depto</th>
                <th className="pb-3 px-2">Estado</th>
                <th className="pb-3 px-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complexVisitors.slice(0, 5).map((vis) => {
                const colors = statusColor(vis.status);
                return (
                  <tr key={vis.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-emerald-700">
                      {vis.code}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-900">
                      {vis.name}
                    </td>
                    <td className="py-3 px-2 text-slate-700">
                      <div>{vis.visiting_name}</div>
                      <div className="text-[10px] text-slate-400">Depto: {vis.apartment_number}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {statusLabel(vis.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('guard_validator')}
                        className="text-[11px] py-1"
                      >
                        Validar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
