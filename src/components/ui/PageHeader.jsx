import React from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const PageHeader = ({
  title,
  subtitle,
  badge,
  action,
  icon,
  className,
}) => {
  const { currentComplex } = useAuth();
  const isLight = currentComplex?.plan === 'free';
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn('p-2.5 rounded-xl border shrink-0', isLight ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' : 'bg-brand-500/15 text-brand-300 border-brand-500/20')}>
              {icon}
            </div>
          )}
          <h1 className={cn('text-xl sm:text-2xl font-extrabold tracking-tight truncate', isLight ? 'text-slate-900' : 'text-white')}>{title}</h1>
          {badge}
        </div>
        {subtitle && <p className={cn('text-xs sm:text-sm font-semibold mt-1.5', isLight ? 'text-slate-600' : 'text-slate-300')}>{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
