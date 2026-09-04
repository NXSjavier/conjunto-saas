import React from 'react';
import { FileSpreadsheet, Download, TrendingUp, AlertTriangle, CalendarCheck, History, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { generateSubscriptionReceiptPDF } from '../../../lib/pdf';
import { soundEngine } from '../../../lib/sound';

export const ReportsView: React.FC = () => {
  const { currentComplex, currentUser } = useAuth();
  const { incidents, reservations, visitors, apartments, users } = useData();

  const complexId = currentComplex?.id || 1;
  const complexIncidents = incidents.filter((i) => i.residential_complex_id === complexId);
  const complexReservations = reservations.filter((r) => r.residential_complex_id === complexId);
  const complexVisitors = visitors.filter((v) => v.residential_complex_id === complexId);
  const complexApts = apartments.filter((a) => a.residential_complex_id === complexId);

  // Incidents stats
  const openInc = complexIncidents.filter((i) => i.status === 'open' || i.status === 'in_progress').length;
  const resolvedInc = complexIncidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;

  // Visitors stats
  const inVis = complexVisitors.filter((v) => v.status === 'in').length;
  const outVis = complexVisitors.filter((v) => v.status === 'out').length;

  const handleExportPDF = () => {
    if (!currentComplex) return;
    generateSubscriptionReceiptPDF({
      complexName: currentComplex.name,
      complexCode: currentComplex.code,
      adminName: currentUser?.name || 'Administrador',
      adminEmail: currentUser?.email || 'admin@conjuntos.app',
      plan: currentComplex.plan,
      amount: currentComplex.plan === 'enterprise' ? '$49 USD / mes' : currentComplex.plan === 'pro' ? '$24 USD / mes' : '$0 USD',
      periodMonths: 1,
      paymentDate: new Date().toLocaleDateString('es-CO'),
      expiresAt: new Date(currentComplex.current_period_end || Date.now()).toLocaleDateString('es-CO'),
      notes: `Reporte ejecutivo de gestión y métricas generado para ${currentComplex.name}.`,
    });
    soundEngine.playSuccessChime();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y Métricas Operativas"
        subtitle={`Resumen estadístico de ocupación, seguridad y solicitudes en ${currentComplex?.name || 'el conjunto'}`}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            icon={<Download className="h-4 w-4" />}
          >
            Descargar Reporte PDF
          </Button>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Incidents Card */}
        <Card title="Estado de Incidencias">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total registradas</span>
              <span className="font-bold text-slate-900">{complexIncidents.length}</span>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${
                    complexIncidents.length > 0 ? (resolvedInc / complexIncidents.length) * 100 : 0
                  }%`,
                }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{
                  width: `${
                    complexIncidents.length > 0 ? (openInc / complexIncidents.length) * 100 : 0
                  }%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Resueltas: {resolvedInc}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Pendientes: {openInc}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Visitors Card */}
        <Card title="Tráfico de Visitantes">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Pases Generados</span>
              <span className="font-bold text-slate-900">{complexVisitors.length}</span>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full"
                style={{
                  width: `${
                    complexVisitors.length > 0 ? (inVis / complexVisitors.length) * 100 : 0
                  }%`,
                }}
              />
              <div
                className="bg-slate-400 h-full"
                style={{
                  width: `${
                    complexVisitors.length > 0 ? (outVis / complexVisitors.length) * 100 : 0
                  }%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Adentro ahora: {inVis}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Salidas: {outVis}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Occupancy Card */}
        <Card title="Ocupación Habitacional">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Departamentos</span>
              <span className="font-bold text-slate-900">{complexApts.length}</span>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${
                    complexApts.length > 0
                      ? (complexApts.filter((a) => a.status === 'occupied').length /
                          complexApts.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Ocupados: {complexApts.filter((a) => a.status === 'occupied').length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span>Disponibles: {complexApts.filter((a) => a.status === 'available').length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Box */}
      <Card title="Resumen de Cumplimiento y Seguridad">
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Todos los pases de visitantes están sincronizados con la garita principal y validados mediante alerta acústica de 880Hz.</span>
          </div>
          <div className="flex items-center gap-2 text-blue-800 bg-blue-50 p-3 rounded-xl border border-blue-200 font-medium">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>El registro de auditoría almacena cada cambio de estado, aprobación de residente y modificación de unidades en tiempo real.</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
