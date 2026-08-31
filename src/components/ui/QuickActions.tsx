import React from 'react';
import { cn } from '../../lib/utils';

export interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  variant?: 'emerald' | 'sky' | 'amber' | 'purple' | 'rose' | 'slate';
}

export interface QuickActionsProps {
  title?: string;
  actions: QuickActionItem[];
  columns?: 2 | 3 | 4;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  title = 'Acciones Rápidas',
  actions,
  columns = 3,
}) => {
  const colStyles = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const iconVariants = {
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
    slate: 'bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white',
  };

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>}
      <div className={cn('grid gap-3', colStyles[columns])}>
        {actions.map((action) => {
          const variantClass = iconVariants[action.variant || 'emerald'];
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group relative flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 text-left shadow-xs hover:shadow-md hover:border-emerald-300 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  variantClass
                )}
              >
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    {action.label}
                  </h4>
                  {action.badge && (
                    <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
