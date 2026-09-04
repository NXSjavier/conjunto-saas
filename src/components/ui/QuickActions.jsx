import React from 'react';
import { cn } from '../../lib/utils';

export const QuickActions = ({
  items,
  title = 'Acciones Rápidas',
}) => {
  const iconVariants = {
    emerald: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950',
    sky: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950',
    purple: 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950',
    amber: 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950',
    rose: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-slate-950',
  };

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{title}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {items.map((item) => {
          const variant = item.variant || 'emerald';
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="group text-left rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-850 hover:shadow-lg hover:shadow-slate-950/40 cursor-pointer flex items-start gap-3.5"
            >
              <div
                className={cn(
                  'p-3 rounded-xl border border-slate-800 transition-all duration-200 shrink-0',
                  iconVariants[variant]
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                    {item.title}
                  </h4>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
