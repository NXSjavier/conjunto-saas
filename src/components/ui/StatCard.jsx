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
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-700 hover:bg-slate-900 hover:scale-[1.01]'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={cn('p-2.5 rounded-xl border', iconColors[variant])}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            {trend && (
              <span className={cn('font-semibold', trend.positive ? 'text-emerald-400' : 'text-rose-400')}>
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
