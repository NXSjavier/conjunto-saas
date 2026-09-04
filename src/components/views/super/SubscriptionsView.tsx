import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Download,
  Upload,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../ui/PageHeader';
import { StatCard } from '../../ui/StatCard';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { FlashMessage } from '../../ui/FlashMessage';
import { formatDateOnly, calculateDaysRemaining } from '../../../lib/utils';
import { generateSubscriptionReceiptPDF } from '../../../lib/pdf';
import { soundEngine } from '../../../lib/sound';
import { ResidentialComplex, PlanType, PLAN_LIMITS } from '../../../types';

export const SubscriptionsView: React.FC = () => {
  const { complexes, apartments, markComplexPaid, toggleComplexStatus, changeComplexPlan } = useData();
  const { currentUser } = useAuth();

  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'trial' | 'blocked'>('all');
  const [selectedComplexForPay, setSelectedComplexForPay] = useState<ResidentialComplex | null>(null);
  const [selectedComplexForPlan, setSelectedComplexForPlan] = useState<ResidentialComplex | null>(null);
  const [payMonths, setPayMonths] = useState(1);
  const [payNotes, setPayNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState<PlanType>('pro');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Stats calculation
  const totalSubs = complexes.length;
  const activeSubs = complexes.filter((c) => c.subscription_status === 'active').length;
  const trialSubs = complexes.filter((c) => c.subscription_status === 'trial').length;
  const blockedSubs = complexes.filter((c) => c.subscription_status === 'blocked').length;

  const filteredComplexes = complexes.filter((c) => {
    if (filterTab === 'all') return true;
    return c.subscription_status === filterTab;
  });

  const handleOpenPayModal = (c: ResidentialComplex) => {
    setSelectedComplexForPay(c);
    setPayMonths(1);
    setPayNotes(`Pago por suscripción mensual Plan ${c.plan.toUpperCase()}`);
    setReceiptFile(null);
  };

  const handleConfirmPay = () => {
    if (!selectedComplexForPay) return;
    markComplexPaid(selectedComplexForPay.id, payMonths, payNotes);
    soundEngine.playSuccessChime();

    // Generate & Download Receipt PDF
    generateSubscriptionReceiptPDF({
      complexName: selectedComplexForPay.name,
      complexCode: selectedComplexForPay.code,
      adminName: currentUser?.name || 'Super Administrador',
      adminEmail: currentUser?.email || 'superadmin@conjuntos.app',
      plan: selectedComplexForPay.plan,
      amount:
        selectedComplexForPay.plan === 'enterprise'
          ? `$${49 * payMonths} USD`
          : selectedComplexForPay.plan === 'pro'
          ? `$${24 * payMonths} USD`
          : '$0 USD',
      periodMonths: payMonths,
      paymentDate: new Date().toLocaleDateString('es-CO'),
      expiresAt: new Date(Date.now() + payMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
      notes: payNotes,
    });

    setFlash({
      message: `Pago registrado por ${payMonths} mes(es) para ${selectedComplexForPay.name}. Recibo PDF generado.`,
      type: 'success',
    });
    setSelectedComplexForPay(null);
  };

  const handleToggleStatus = (id: number, name: string) => {
    toggleComplexStatus(id);
    setFlash({ message: `Estado de suscripción actualizado para "${name}"`, type: 'info' });
  };

  const handleChangePlan = () => {
    if (!selectedComplexForPlan) return;
    changeComplexPlan(selectedComplexForPlan.id, newPlan);
    soundEngine.playSuccessChime();
    setFlash({ message: `Plan cambiado a ${newPlan.toUpperCase()} para ${selectedComplexForPlan.name}`, type: 'success' });
    setSelectedComplexForPlan(null);
  };

  const handleDownloadSingleReceipt = (c: ResidentialComplex) => {
    generateSubscriptionReceiptPDF({
      complexName: c.name,
      complexCode: c.code,
      adminName: currentUser?.name || 'Administrador',
      adminEmail: currentUser?.email || 'admin@conjuntos.app',
      plan: c.plan,
      amount: c.plan === 'enterprise' ? '$49 USD' : c.plan === 'pro' ? '$24 USD' : '$0 USD',
      periodMonths: 1,
      paymentDate: new Date().toLocaleDateString('es-CO'),
      expiresAt: new Date(c.current_period_end || Date.now()).toLocaleDateString('es-CO'),
      notes: c.subscription_notes || `Comprobante de membresía activa para ${c.name}.`,
    });
    soundEngine.playSuccessChime();
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Gestión de Suscripciones SaaS"
        subtitle="Administración de membresías, facturación mensual, control de límites y cortes de servicio"
        badge={<Badge variant="purple">{totalSubs} contratos</Badge>}
      />

      {/* 4 StatCards (Section 4.1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Suscripciones"
          value={totalSubs}
          icon={<CreditCard className="h-5 w-5" />}
          variant="purple"
        />
        <StatCard
          label="Al Día (Activas)"
          value={activeSubs}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="green"
        />
        <StatCard
          label="En Período de Prueba"
          value={trialSubs}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="blue"
        />
        <StatCard
          label="Bloqueadas / Vencidas"
          value={blockedSubs}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={blockedSubs > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold max-w-md">
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Todos ({totalSubs})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            filterTab === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Activos ({activeSubs})
        </button>
        <button
          onClick={() => setFilterTab('trial')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            filterTab === 'trial' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          En Prueba ({trialSubs})
        </button>
        <button
          onClick={() => setFilterTab('blocked')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            filterTab === 'blocked' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Bloqueados ({blockedSubs})
        </button>
      </div>

      {/* Complexes Subscription Table */}
      <div className="space-y-4">
        {filteredComplexes.map((c) => {
          const aptCount = apartments.filter((a) => a.residential_complex_id === c.id).length;
          const planConfig = PLAN_LIMITS[c.plan] || PLAN_LIMITS.free;
          const maxApts = planConfig.maxApartments;
          const usagePercent = maxApts === -1 ? 15 : Math.min(100, Math.round((aptCount / maxApts) * 100));
          const daysLeft = calculateDaysRemaining(c.current_period_end);

          return (
            <Card key={c.id} className="relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                    <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'}>
                      PLAN {c.plan.toUpperCase()}
                    </Badge>
                    <Badge variant={c.subscription_status === 'active' ? 'emerald' : c.subscription_status === 'trial' ? 'sky' : 'rose'}>
                      {c.subscription_status.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {c.city} • {c.address} • Admin: {c.phone || 'Sin teléfono'}
                  </p>

                  {/* Progress Bar of apartments used vs limit */}
                  <div className="pt-2 max-w-md">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>Uso de Departamentos:</span>
                      <span className="font-bold">
                        {aptCount} / {maxApts === -1 ? 'Ilimitados' : maxApts} ({usagePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Center / Right: Expiration and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0">
                  {/* Days remaining badge */}
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Vencimiento:</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {c.current_period_end ? formatDateOnly(c.current_period_end) : '—'}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        daysLeft < 0 ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {daysLeft < 0 ? `Vencido (${Math.abs(daysLeft)} días)` : `${daysLeft} días restantes`}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenPayModal(c)}
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                    >
                      Marcar Pagado
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedComplexForPlan(c);
                        setNewPlan(c.plan);
                      }}
                      className="text-xs"
                    >
                      Cambiar Plan
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(c.id, c.name)}
                      className={c.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
                      icon={c.status === 'active' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    >
                      {c.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                    </Button>

                    <button
                      onClick={() => handleDownloadSingleReceipt(c)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Descargar Recibo en PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal: Mark Paid */}
      <Modal
        isOpen={Boolean(selectedComplexForPay)}
        onClose={() => setSelectedComplexForPay(null)}
        title="Registrar Pago de Suscripción"
        subtitle={`Conjunto: ${selectedComplexForPay?.name}`}
      >
        {selectedComplexForPay && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <span className="font-bold block">Plan Actual: {selectedComplexForPay.plan.toUpperCase()}</span>
                <span>Tarifa Mensual: {selectedComplexForPay.plan === 'enterprise' ? '$49 USD' : selectedComplexForPay.plan === 'pro' ? '$24 USD' : '$0 USD'}</span>
              </div>
              <Badge variant="emerald">SaaS Billing</Badge>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Período a Renovar
              </label>
              <select
                value={payMonths}
                onChange={(e) => setPayMonths(Number(e.target.value))}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-200 focus:outline-none"
              >
                <option value={1}>1 Mes (Pago Mensual)</option>
                <option value={3}>3 Meses (Trimestral)</option>
                <option value={6}>6 Meses (Semestral - 10% Descuento)</option>
                <option value={12}>12 Meses (Anual - 20% Descuento)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notas del Comprobante / Referencia
              </label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                placeholder="Ej: Transferencia Bancaria N° 982183 - Bancolombia"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Adjuntar Comprobante de Pago (Simulado):
              </span>
              <label className="flex items-center justify-center gap-2 p-3 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-xs text-slate-600">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>{receiptFile ? 'Comprobante adjuntado con éxito' : 'Subir archivo JPG, PNG o PDF'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={() => setReceiptFile('comprobante_pago.pdf')}
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedComplexForPay(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmPay}>
                Confirmar y Generar PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Change Plan */}
      <Modal
        isOpen={Boolean(selectedComplexForPlan)}
        onClose={() => setSelectedComplexForPlan(null)}
        title="Cambiar Plan de Suscripción"
        subtitle={`Conjunto: ${selectedComplexForPlan?.name}`}
      >
        {selectedComplexForPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {(['free', 'pro', 'enterprise'] as const).map((p) => {
                const isSelected = newPlan === p;
                const conf = PLAN_LIMITS[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPlan(p)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">{conf.name}</span>
                    <span className="text-sm font-extrabold text-emerald-700 block mt-1">
                      {p === 'free' ? '$0' : p === 'pro' ? '$24' : '$49'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {conf.maxApartments === -1 ? 'Ilimitados' : `Hasta ${conf.maxApartments} deptos`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedComplexForPlan(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleChangePlan}>
                Actualizar Plan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
