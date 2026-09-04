import React from 'react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'emerald' | 'green' | 'amber' | 'blue' | 'red' | 'slate' | 'purple';
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  variant = 'emerald',
  trend,
  trendPositive = true,
  onClick,
  className,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      accent: 'border-l-emerald-500',
      valColor: 'text-slate-900',
    },
    green: {
      bg: 'bg-emerald-100 text-emerald-700',
      accent: 'border-l-emerald-600',
      valColor: 'text-slate-900',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      accent: 'border-l-amber-500',
      valColor: 'text-slate-900',
    },
    blue: {
      bg: 'bg-sky-50 text-sky-600',
      accent: 'border-l-sky-500',
      valColor: 'text-slate-900',
    },
    red: {
      bg: 'bg-rose-50 text-rose-600',
      accent: 'border-l-rose-500',
      valColor: 'text-slate-900',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      accent: 'border-l-purple-500',
      valColor: 'text-slate-900',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-600',
      accent: 'border-l-slate-400',
      valColor: 'text-slate-900',
    },
  };

  const scheme = colorMap[variant] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 p-4 shadow-sm transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 truncate uppercase tracking-wider">{label}</span>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', scheme.bg)}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className={cn('text-2xl font-bold tracking-tight', scheme.valColor)}>{value}</div>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-medium px-1.5 py-0.5 rounded-md',
              trendPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
