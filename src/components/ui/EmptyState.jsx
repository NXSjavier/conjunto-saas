import React from 'react';
import { cn } from '../../lib/utils';

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 my-4',
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-slate-800/60 text-slate-400 mb-3.5 border border-slate-700/50">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
