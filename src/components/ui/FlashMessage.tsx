import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FlashMessageProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const FlashMessage: React.FC<FlashMessageProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: 'bg-emerald-600 text-white shadow-emerald-600/20 border-emerald-500',
    error: 'bg-rose-600 text-white shadow-rose-600/20 border-rose-500',
    info: 'bg-slate-900 text-white shadow-slate-900/20 border-slate-700',
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-100" />,
    error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-100" />,
    info: <Info className="h-5 w-5 shrink-0 text-slate-300" />,
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-top-4 duration-200">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md',
          styles[type]
        )}
      >
        {icons[type]}
        <p className="flex-1 text-xs sm:text-sm font-semibold leading-tight">{message}</p>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
