import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold rounded-control transition-all duration-200 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none whitespace-nowrap cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-2 text-xs gap-1.5 min-h-[44px] min-w-[44px]',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand-500 hover:bg-brand-400 text-surface-950 shadow-brand active:scale-[0.98]',
    secondary:
      'bg-surface-800 hover:bg-slate-700 text-slate-100 border border-slate-700/70 hover:border-slate-600 active:scale-[0.98]',
    outline:
      'border border-slate-700 bg-transparent hover:bg-surface-800/70 hover:border-slate-600 text-slate-300 hover:text-white',
    danger:
      'bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-surface-800 text-slate-300 hover:text-white',
    success:
      'bg-brand-500/15 hover:bg-brand-500 text-brand-300 hover:text-surface-950 border border-brand-500/30 hover:border-brand-500 active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : icon}
      {children}
    </button>
  );
};
