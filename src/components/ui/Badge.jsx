import React from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({
  children,
  variant = 'emerald',
  size = 'md',
  className,
  dot = false,
}) => {
  const variantStyles = {
    emerald: 'bg-brand-500/10 text-brand-300 border-brand-500/25',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    slate: 'bg-surface-800 text-slate-400 border-slate-700',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
  };

  const dotStyles = {
    emerald: 'bg-brand-400',
    purple: 'bg-purple-400',
    sky: 'bg-sky-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
    indigo: 'bg-indigo-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotStyles[variant])} />}
      {children}
    </span>
  );
};
