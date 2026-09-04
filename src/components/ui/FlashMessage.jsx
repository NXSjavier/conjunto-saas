import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const FlashMessage = ({ type, message, onClose }) => {
  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    info: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  };

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-150 my-3 ${styles[type]}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-slate-900/40 rounded transition-colors text-current">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
