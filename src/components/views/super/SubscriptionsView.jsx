import React from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { DollarSign, CheckCircle2, FileText, Sparkles, Building2, Calendar, ShieldCheck } from 'lucide-react';
import { PLAN_LIMITS } from '../../../types.js';
import { daysUntilExpiry, formatDateOnly } from '../../../lib/utils';
import { generateMonthlySubscriptionsReportPDF } from '../../../lib/pdf';

export const SubscriptionsView = () => {
  const { complexes, markComplexPaid, changeComplexPlan } = useData();
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Planes y Suscripciones SaaS"
        subtitle="Administra planes tarifarios, estado de facturación mensual y emisión de recibos PDF."
        action={
          currentUser && (
            <Button
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => generateMonthlySubscriptionsReportPDF(complexes, currentUser)}
            >
              Informe Mensual PDF
            </Button>
          )
        }
      />

      {/* Pricing Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['free', 'pro', 'enterprise']).map((p) => {
          const config = PLAN_LIMITS[p];
          const isFeatured = p === 'pro';
          const isEnterprise = p === 'enterprise';

          return (
            <Card
              key={p}
              className={`relative flex flex-col justify-between overflow-hidden ${
                isFeatured
                  ? 'border-cyan-400/60 bg-gradient-to-b from-slate-900 via-slate-900 to-cyan-950/40 shadow-2xl shadow-cyan-500/10'
                  : isEnterprise
                  ? 'border-violet-500/60 bg-gradient-to-b from-slate-900 via-slate-900 to-violet-950/30'
                  : 'border-slate-700 bg-slate-900/70'
              }`}
            >
              {isFeatured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-lg shadow-cyan-500/20">
                  Más Popular
                </span>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-bold text-slate-100">{config.name}</h4>
                  {isFeatured && (
                    <span className="rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.15em] font-semibold">
                      Pro
                    </span>
                  )}
                </div>

                <div className="text-3xl font-black text-white mt-2 leading-none">{config.price}</div>
                <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">{p === 'free' ? '30 días' : 'mes'}</p>

                <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Apartamentos:</span>
                    <span className="font-semibold text-slate-100">
                      {config.max_apartments === 9999 ? 'Ilimitados' : `Hasta ${config.max_apartments}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Personal de Guardia:</span>
                    <span className="font-semibold text-slate-100">
                      {config.max_guards === 999 ? 'Ilimitados' : `Hasta ${config.max_guards}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Áreas Comunes / Zonas:</span>
                    <span className="font-semibold text-slate-100">
                      {config.max_areas === 999 ? 'Ilimitadas' : `Hasta ${config.max_areas}`}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  {config.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 rounded-lg bg-slate-950/40 px-2 py-1.5 border border-slate-800/60">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isFeatured ? 'text-cyan-300' : isEnterprise ? 'text-violet-300' : 'text-emerald-400'}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Complexes Subscription Status Table */}
      <Card
        title="Estado de Suscripciones por Conjunto Residencial"
        subtitle="Control de vigencia, cobros y extensiones de 30 días con generación automática de recibo PDF."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Conjunto</th>
                <th className="px-4 py-3">Plan Actual</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vigencia / Días Restantes</th>
                <th className="px-4 py-3 text-right">Acciones de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {complexes.map((c) => {
                const daysLeft = daysUntilExpiry(c.subscription_expiry);
                const isExpired = daysLeft <= 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{c.code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'} size="sm">
                        {c.plan.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={isExpired ? 'rose' : c.subscription_status === 'trial' ? 'sky' : 'emerald'} size="sm" dot>
                        {isExpired ? 'Vencido' : c.subscription_status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <div>Vence: {formatDateOnly(c.subscription_expiry)}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${daysLeft <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {c.plan !== 'free' && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<DollarSign className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (confirm(`Poner ${c.name} en plan Gratuito? Se activará con un periodo de prueba de 30 días.`)) {
                              changeComplexPlan(c.id, 'free');
                            }
                          }}
                        >
                          Free
                        </Button>
                      )}
                      {c.plan !== 'pro' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={<DollarSign className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (confirm(`Activar plan Pro para ${c.name}? Se renovará por 30 días.`)) {
                              changeComplexPlan(c.id, 'pro');
                            }
                          }}
                        >
                          Activar Pro
                        </Button>
                      )}
                      {c.plan !== 'enterprise' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (confirm(`Activar plan Enterprise para ${c.name}? Se renovará por 30 días.`)) {
                              changeComplexPlan(c.id, 'enterprise');
                            }
                          }}
                        >
                          Enterprise
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        onClick={() => markComplexPaid(c)}
                      >
                        Renovar 30d
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
