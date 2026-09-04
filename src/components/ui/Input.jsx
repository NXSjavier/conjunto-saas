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
        <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
            'w-full rounded-2xl bg-white border border-emerald-100 text-slate-900 text-sm placeholder-slate-400 py-3 px-3.5 shadow-sm transition-all duration-200',
            'focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100',
            icon && 'pl-10',
            error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-100',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
