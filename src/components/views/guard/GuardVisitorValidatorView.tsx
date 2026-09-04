import React, { useState } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  LogIn,
  LogOut,
  XCircle,
  Clock,
  User,
  Home,
  Volume2,
  FileText,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { FlashMessage } from '../../ui/FlashMessage';
import { statusColor, statusLabel, formatDate } from '../../../lib/utils';
import { soundEngine } from '../../../lib/sound';
import { Visitor, VisitorStatus } from '../../../types';

export const GuardVisitorValidatorView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { visitors, findVisitorByCode, updateVisitorStatus } = useData();

  const [inputCode, setInputCode] = useState('');
  const [searchedVisitor, setSearchedVisitor] = useState<Visitor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const complexId = currentComplex?.id || 1;
  const complexVisitors = visitors.filter((v) => v.residential_complex_id === complexId);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;

    const found = findVisitorByCode(inputCode.trim().toUpperCase());
    if (found && found.residential_complex_id === complexId) {
      setSearchedVisitor(found);
      setNotFound(false);
      soundEngine.playNotificationBeep(880, 0.25);
    } else {
      setSearchedVisitor(null);
      setNotFound(true);
      soundEngine.playErrorBeep();
    }
  };

  const handleAction = (status: VisitorStatus) => {
    if (!searchedVisitor) return;

    updateVisitorStatus(searchedVisitor.id, status);

    // Refresh current searched visitor state
    const updated = visitors.find((v) => v.id === searchedVisitor.id);
    if (updated) {
      setSearchedVisitor({ ...updated, status });
    }

    setFlash({
      message: `Pase de ${searchedVisitor.name} actualizado a: ${statusLabel(status).toUpperCase()}`,
      type: status === 'rejected' ? 'error' : 'success',
    });
  };

  const handleQuickCodePick = (code: string) => {
    setInputCode(code);
    const found = findVisitorByCode(code);
    if (found) {
      setSearchedVisitor(found);
      setNotFound(false);
      soundEngine.playNotificationBeep(880, 0.25);
    }
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Validador de Pases de Visita (Garita)"
        subtitle="Ingresa el código de 8 dígitos para consultar y autorizar el acceso en garita"
        badge={
          <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
            <Volume2 className="h-3.5 w-3.5" />
            <span className="font-semibold">Audio Beep 880Hz Activado</span>
          </div>
        }
      />

      {/* Code Search Input Box */}
      <Card className="bg-slate-900 text-white border-slate-800 shadow-xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Código del Pase (8 caracteres):
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setNotFound(false);
                }}
                placeholder="EJ: 4A8B-9C2D"
                className="w-full bg-slate-950 border-2 border-emerald-500/80 rounded-2xl px-4 py-3 text-emerald-400 font-mono text-xl font-extrabold placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 tracking-widest text-center sm:text-left"
                autoFocus
              />
            </div>

            <div className="sm:self-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={<Search className="h-5 w-5" />}
                className="w-full sm:w-auto h-13 px-8 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
              >
                Buscar Código
              </Button>
            </div>
          </div>

          {/* Quick Demo Code Tags */}
          <div className="pt-2 flex items-center gap-2 flex-wrap text-xs text-slate-400">
            <span>Códigos activos para probar:</span>
            {complexVisitors.slice(0, 3).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleQuickCodePick(v.code)}
                className="font-mono bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer text-xs"
              >
                {v.code}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Code Not Found Alert */}
      {notFound && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold">Código no válido o no encontrado</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Verifica que el código pertenezca a {currentComplex?.name || 'este conjunto'} y esté bien escrito.
            </p>
          </div>
        </div>
      )}

      {/* Searched Visitor Result Card */}
      {searchedVisitor && (
        <Card className="border-2 border-emerald-500 shadow-xl bg-white overflow-hidden animate-in fade-in">
          <div className="bg-emerald-50 -mx-6 -mt-6 p-4 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Pase de Visita Autenticado
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-xs">
              {searchedVisitor.code}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visitor Info */}
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Visitante:</span>
                <h3 className="text-lg font-bold text-slate-900">{searchedVisitor.name}</h3>
                {searchedVisitor.document_number && (
                  <p className="text-xs text-slate-500">Cédula / Documento: {searchedVisitor.document_number}</p>
                )}
                {searchedVisitor.phone && (
                  <p className="text-xs text-slate-500">Teléfono: {searchedVisitor.phone}</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Destino / Residente que autoriza:
                </span>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{searchedVisitor.visiting_name}</span>
                </div>
                <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5 mt-1">
                  <Home className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Departamento: {searchedVisitor.apartment_number}</span>
                </div>
              </div>
            </div>

            {/* Current Status and Timestamps */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Estado del Pase:</span>
                  <Badge variant={searchedVisitor.status === 'in' ? 'emerald' : searchedVisitor.status === 'rejected' ? 'rose' : 'sky'}>
                    {statusLabel(searchedVisitor.status).toUpperCase()}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/80">
                  <div>Generado: {formatDate(searchedVisitor.created_at)}</div>
                  {searchedVisitor.check_in_at && (
                    <div className="text-emerald-700 font-semibold">
                      Ingreso (IN): {formatDate(searchedVisitor.check_in_at)}
                    </div>
                  )}
                  {searchedVisitor.check_out_at && (
                    <div className="text-slate-600">
                      Salida (OUT): {formatDate(searchedVisitor.check_out_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons with 880Hz Sound feedback */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleAction('in')}
                  icon={<LogIn className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Registrar IN
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleAction('out')}
                  icon={<LogOut className="h-4 w-4" />}
                  className="border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Registrar OUT
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction('confirmed')}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  className="col-span-1"
                >
                  Confirmar
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleAction('rejected')}
                  icon={<XCircle className="h-4 w-4" />}
                  className="col-span-1"
                >
                  Rechazar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Guard Directory link */}
      <Card title="Directorio Rápido para Consultas">
        <p className="text-xs text-slate-600">
          ¿El visitante no cuenta con código o necesita confirmar con el copropietario? Accede al directorio telefónico del conjunto para realizar la consulta directamente.
        </p>
      </Card>
    </div>
  );
};
