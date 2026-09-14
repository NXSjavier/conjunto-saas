import React from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const QuickActions = ({
  items,
  title = 'Acciones Rápidas',
}) => {
  const { currentComplex } = useAuth();
  const isLight = currentComplex?.plan === 'free';
  const iconVariants = {
    emerald: 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white border border-emerald-500/20',
    sky: 'bg-sky-500/15 text-sky-300 group-hover:bg-sky-500 group-hover:text-white border border-sky-500/20',
    purple: 'bg-violet-500/15 text-violet-300 group-hover:bg-violet-500 group-hover:text-white border border-violet-500/20',
    amber: 'bg-amber-500/15 text-amber-300 group-hover:bg-amber-500 group-hover:text-white border border-amber-500/20',
    rose: 'bg-rose-500/15 text-rose-300 group-hover:bg-rose-500 group-hover:text-white border border-rose-500/20',
  };

  return (
    <div className="space-y-3">
      {title && <h3 className={cn('text-sm font-extrabold uppercase tracking-widest', isLight ? 'text-slate-700' : 'text-slate-300')}>{title}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {items.map((item) => {
          const variant = item.variant || 'emerald';
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="group text-left rounded-2xl bg-slate-900 border border-slate-700/60 p-4 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:shadow-lg hover:shadow-black/20 cursor-pointer flex items-start gap-3.5"
            >
              <div className={cn('p-3 rounded-xl transition-all duration-200 shrink-0', iconVariants[variant])}>{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                  {item.badge && <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-white">{item.badge}</span>}
                </div>
                <p className="text-xs font-medium text-slate-300 line-clamp-2 mt-1">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
