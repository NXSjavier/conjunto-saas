import React from 'react';
import { AlertTriangle, AlertCircle, Clock, ArrowUpRight } from 'lucide-react';
import { ResidentialComplex } from '../../types';
import { daysUntilExpiry } from '../../lib/utils';

export interface SubscriptionAlertProps {
  complex: ResidentialComplex;
  apartmentCount?: number;
  maxApartments?: number;
  onUpgradeClick?: () => void;
}

export const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({
  complex,
  apartmentCount = 0,
  maxApartments = 50,
  onUpgradeClick,
}) => {
  const daysLeft = daysUntilExpiry(complex.current_period_end || complex.trial_ends_at);
  const isTrial = complex.subscription_status === 'trial';
  const isPastDue = complex.subscription_status === 'past_due' || daysLeft <= 0;
  const isBlocked = complex.subscription_status === 'blocked' || complex.status === 'blocked';

  // Capacity threshold
  const usagePercentage = maxApartments > 0 ? Math.round((apartmentCount / maxApartments) * 100) : 0;
  const isNearLimit = maxApartments > 0 && usagePercentage >= 90;

  if (isBlocked) {
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs mb-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold">Conjunto Residencial Suspendido</h4>
          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
            La suscripción está bloqueada por falta de pago o decisión administrativa. Contacta a soporte para reactivar los servicios.
          </p>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            Reactivar Plan
          </button>
        )}
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs mb-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold">Suscripción Vencida</h4>
          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
            El periodo del plan {complex.plan.toUpperCase()} ha expirado. Regulariza tu cuenta para evitar la suspensión del acceso a guardias y residentes.
          </p>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            Pagar Ahora
          </button>
        )}
      </div>
    );
  }

  if (daysLeft <= 7 && daysLeft > 0) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs mb-6 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold">
            {isTrial ? `Periodo de Prueba Finaliza en ${daysLeft} días` : `Suscripción Próxima a Vencer (${daysLeft} días restantes)`}
          </h4>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            {isTrial
              ? 'Tu periodo de prueba gratuito vence pronto. Actualiza al Plan Pro o Enterprise para no interrumpir el servicio.'
              : 'Renueva tu suscripción para mantener activos todos los módulos de garita, reservas y comunicados.'}
          </p>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1"
          >
            <span>Renovar</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (isNearLimit) {
    return (
      <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4 text-orange-900 shadow-xs mb-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold">Límite de Capacidad al {usagePercentage}%</h4>
          <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
            Has utilizado {apartmentCount} de {maxApartments} departamentos permitidos en tu Plan {complex.plan.toUpperCase()}.
          </p>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
          >
            Ampliar Plan
          </button>
        )}
      </div>
    );
  }

  return null;
};
