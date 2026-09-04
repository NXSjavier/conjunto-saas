import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  footer,
  hoverEffect = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm p-5 transition-all duration-200',
        hoverEffect && 'hover:border-slate-700 hover:shadow-xl hover:shadow-slate-950/50 hover:bg-slate-900',
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800/60">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">{footer}</div>}
    </div>
  );
};
