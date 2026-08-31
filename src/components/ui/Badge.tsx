import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  variant?: 'emerald' | 'sky' | 'amber' | 'rose' | 'purple' | 'slate';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  children,
  className,
  dot = false,
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    sky: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const dotStyles = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border whitespace-nowrap',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
};
