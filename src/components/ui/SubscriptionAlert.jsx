import React from 'react';

import { daysUntilExpiry } from '../../lib/utils';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from './Button';

export const SubscriptionAlert = ({ complex, onUpgrade }) => {
  if (!complex) return null;

  const daysLeft = daysUntilExpiry(complex.subscription_expiry);
  const isTrial = complex.subscription_status === 'trial';
  const isExpiringSoon = daysLeft <= 5;
  const isExpired = daysLeft <= 0 || complex.subscription_status === 'past_due' || complex.subscription_status === 'blocked';

  if (!isTrial && !isExpiringSoon && !isExpired) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4 ${
        isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : isExpiringSoon
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-900/60 shrink-0">
          {isExpired || isExpiringSoon ? (
            <AlertTriangle className="w-5 h-5 text-current" />
          ) : (
            <Sparkles className="w-5 h-5 text-current" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-100">
            {isExpired
              ? 'Suscripción Vencida o Bloqueada'
              : isExpiringSoon
              ? `Tu suscripción vence en ${daysLeft} días`
              : `Conjunto en periodo de prueba (${daysLeft} días restantes)`}
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            {isExpired
              ? 'Por favor renueva tu plan SaaS para habilitar todas las funciones de visitantes y reservas.'
              : 'Disfruta de la suite completa con control de acceso y WebSockets en tiempo real.'}
          </p>
        </div>
      </div>
      {onUpgrade && (
        <Button size="sm" variant={isExpired ? 'danger' : 'primary'} onClick={onUpgrade}>
          {isExpired ? 'Renovar Ahora' : 'Mejorar Plan'}
        </Button>
      )}
    </div>
  );
};
