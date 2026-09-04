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
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  const dotStyles = {
    emerald: 'bg-emerald-400',
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
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
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
