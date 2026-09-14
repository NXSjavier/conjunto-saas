import React from 'react';
import { cn } from '../../lib/utils';

export const StatCard = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  variant = 'emerald',
  onClick,
}) => {
  const iconColors = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    sky: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    purple: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800 text-slate-200 border-slate-600',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick(e);
            }
          : undefined
      }
      className={cn(
        'rounded-card bg-slate-900 border border-slate-700/60 shadow-card p-5 transition-all duration-200',
        onClick &&
          'cursor-pointer hover:border-slate-600 hover:bg-slate-800 hover:shadow-card-hover hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</span>
        {icon && <div className={cn('p-2.5 rounded-xl border shadow-sm', iconColors[variant])}>{icon}</div>}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-slate-300">
            {trend && (
              <span className={cn('font-semibold', trend.positive ? 'text-brand-400' : 'text-rose-400')}>
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
