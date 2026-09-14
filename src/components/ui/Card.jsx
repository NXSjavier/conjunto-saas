import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  footer,
  hoverEffect = false,
  padding = 'md',
  className,
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-card bg-slate-900 border border-slate-700/60 shadow-card transition-all duration-200',
        paddingStyles[padding],
        hoverEffect &&
          'hover:border-slate-600 hover:shadow-card-hover hover:bg-slate-800 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-700">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-bold text-white truncate">{title}</h3>}
            {subtitle && <p className="text-xs font-medium text-slate-300 mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-700 text-xs font-medium text-slate-300">{footer}</div>
      )}
    </div>
  );
};
