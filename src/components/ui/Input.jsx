import React from 'react';
import { cn } from '../../lib/utils';

export const Input = ({
  label,
  error,
  helperText,
  icon,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            {icon}
          </div>
        )}
          <input
          id={inputId}
          className={cn(
            'w-full rounded-control bg-surface-900/80 border border-slate-700/80 text-slate-100 text-sm placeholder-slate-500',
            'py-2.5 px-3.5 shadow-sm transition-all duration-200',
            'hover:border-slate-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[44px]',
            icon && 'pl-10',
            error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/25',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
