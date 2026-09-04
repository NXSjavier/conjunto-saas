import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/PageHeader';
import {
  QrCode,
  Search,
  CheckCircle2,
  LogIn,
  LogOut,
  XCircle,
  Clock,
  User,
  Building,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { playNotificationBeep, playSuccessChime, playErrorBeep } from '../../../lib/sound';
import { triggerHaptic } from '../../../lib/sound';
import { formatDate } from '../../../lib/utils';

export const GuardVisitorValidatorView = ({ onNavigate }) => {
  const { visitors, findVisitorByCode, updateVisitorStatus } = useData();
  const { currentUser, currentComplex } = useAuth();

  const [codeInput, setCodeInput] = useState('');
  const [foundVisitor, setFoundVisitor] = useState(null);
  const [error, setError] = useState('');
  const [validationHistory, setValidationHistory] = useState([]);

  const pendingVisitors = useMemo(() => {
    return visitors.filter(
      (v) => v.complex_id === currentComplex?.id && v.status === 'registered'
    );
  }, [visitors, currentComplex]);

  const handleValidate = () => {
    setError('');
    setFoundVisitor(null);

    if (!codeInput.trim()) {
      setError('Ingrese un código para validar.');
      playErrorBeep();
      return;
    }

    const visitor = findVisitorByCode(codeInput);

    if (!visitor) {
      setError('Código no encontrado. Verifique el código e intente nuevamente.');
      playErrorBeep();
      return;
    }

    setFoundVisitor(visitor);
    playSuccessChime();
    triggerHaptic();
  };

  const handleCheckIn = async () => {
    if (!foundVisitor) return;
    await updateVisitorStatus(foundVisitor.id, 'in');
    playNotificationBeep();
    triggerHaptic();

    setValidationHistory((prev) => [
      {
        visitor: { ...foundVisitor, status: 'in' },
        action: 'Check-In',
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 19),
    ]);

    setFoundVisitor({ ...foundVisitor, status: 'in' });
    setCodeInput('');
  };

  const handleCheckOut = async () => {
    if (!foundVisitor) return;
    await updateVisitorStatus(foundVisitor.id, 'out');
    playNotificationBeep();
    triggerHaptic();

    setValidationHistory((prev) => [
      {
        visitor: { ...foundVisitor, status: 'out' },
        action: 'Check-Out',
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 19),
    ]);

    setFoundVisitor({ ...foundVisitor, status: 'out' });
    setCodeInput('');
  };

  const handleReject = async () => {
    if (!foundVisitor) return;
    await updateVisitorStatus(foundVisitor.id, 'rejected');
    playNotificationBeep();
    triggerHaptic();

    setValidationHistory((prev) => [
      {
        visitor: { ...foundVisitor, status: 'rejected' },
        action: 'Rechazado',
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 19),
    ]);

    setFoundVisitor(null);
    setCodeInput('');
  };

  const handleQuickSelect = (visitor) => {
    setCodeInput(visitor.code);
    setFoundVisitor(visitor);
    playSuccessChime();
    triggerHaptic();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  const statusColors = {
    registered: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    confirmed: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    in: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    out: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  const statusLabels = {
    registered: 'Registrado',
    confirmed: 'Confirmado',
    in: 'Dentro',
    out: 'Fuera',
    rejected: 'Rechazado',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control de Acceso"
        subtitle="Valida el código de visitantes o selecciona de la lista de pendientes"
        actions={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('guard_dashboard')}>
            Volver al Panel
          </Button>
        }
      />

      {/* Code Input Section */}
      <Card title="Ingresar Código de Visitante">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-full max-w-md">
            <label className="block text-xs text-slate-400 mb-2 text-center">
              Código (formato: VIS-XXXX o XXXX)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="VIS-XXXX"
                className="flex-1 px-4 py-3 text-center text-xl font-mono font-bold tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                autoFocus
              />
              <Button onClick={handleValidate} className="px-6">
                <Search className="w-4 h-4 mr-2" />
                Validar
              </Button>
            </div>
          </div>

          {error && (
            <div className="w-full max-w-md p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Pending Visitors List */}
      {pendingVisitors.length > 0 && (
        <Card
          title="Visitantes Esperados"
          subtitle={`${pendingVisitors.length} visitante(s) registrado(s) esperando llegar`}
        >
          <div className="space-y-2">
            {pendingVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/30 transition-colors cursor-pointer"
                onClick={() => handleQuickSelect(visitor)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <div>
                    <span className="text-sm font-medium text-slate-200">{visitor.visitor_name}</span>
                    <span className="text-slate-500 mx-2">·</span>
                    <span className="font-mono text-xs text-slate-400">{visitor.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{visitor.destination_apartment || '-'}</p>
                    <p className="text-[10px] text-slate-500">{visitor.purpose || ''}</p>
                  </div>
                  <Badge variant="blue" size="sm">Pendiente</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pendingVisitors.length === 0 && (
        <Card>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <AlertCircle className="w-5 h-5 text-slate-500" />
            <p className="text-sm text-slate-400">No hay visitantes pendientes en este momento.</p>
          </div>
        </Card>
      )}

      {/* Found Visitor Info */}
      {foundVisitor && (
        <Card title="Información del Visitante">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Nombre</div>
                  <div className="text-sm font-semibold text-slate-200">{foundVisitor.visitor_name}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <QrCode className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Código</div>
                  <div className="text-sm font-mono font-semibold text-slate-200">{foundVisitor.code}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <Building className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Destino</div>
                  <div className="text-sm font-semibold text-slate-200">{foundVisitor.destination_apartment || '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Residente</div>
                  <div className="text-sm font-semibold text-slate-200">{foundVisitor.resident_name || '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Estado Actual</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[foundVisitor.status] || ''}`}>
                    {statusLabels[foundVisitor.status] || foundVisitor.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">Propósito</div>
                  <div className="text-sm font-semibold text-slate-200">{foundVisitor.purpose || '-'}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {foundVisitor.status !== 'in' && (
                <Button onClick={handleCheckIn} className="bg-emerald-600 hover:bg-emerald-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  Check-In (Confirmar Llegada)
                </Button>
              )}
              {foundVisitor.status === 'in' && (
                <Button onClick={handleCheckOut} variant="outline">
                  <LogOut className="w-4 h-4 mr-2" />
                  Check-Out (Registrar Salida)
                </Button>
              )}
              <Button onClick={handleReject} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Validation History */}
      {validationHistory.length > 0 && (
        <Card
          title="Historial de Validaciones"
          subtitle="Últimas acciones realizadas en esta sesión"
        >
          <div className="space-y-2">
            {validationHistory.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    entry.action === 'Check-In' ? 'bg-emerald-400' :
                    entry.action === 'Check-Out' ? 'bg-slate-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <span className="font-medium text-slate-200">{entry.visitor.visitor_name}</span>
                    <span className="text-slate-500 mx-1">·</span>
                    <span className="font-mono text-slate-400">{entry.visitor.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${
                    entry.action === 'Check-In' ? 'text-emerald-400' :
                    entry.action === 'Check-Out' ? 'text-slate-400' : 'text-red-400'
                  }`}>
                    {entry.action}
                  </span>
                  <span className="text-slate-600">{formatDate(entry.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
