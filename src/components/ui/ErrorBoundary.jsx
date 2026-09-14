import React from 'react';
import { AlertTriangle, RotateCcw, Send } from 'lucide-react';
import { logError } from '../../lib/errorLog';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, reported: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logError(error?.message || 'ErrorBoundary', {
      stack: error?.stack,
      context: { componentStack: info?.componentStack?.slice(0, 2000) },
    });
  }

  handleReport = () => {
    logError(this.state.error?.message || 'Reporte manual desde ErrorBoundary', {
      stack: this.state.error?.stack,
      context: { manual: true, view: window.location.href },
    });
    this.setState({ reported: true });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, reported: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-panel border border-slate-800 bg-surface-900 p-8 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-lg font-extrabold text-white">Algo salió mal</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            La aplicación encontró un error inesperado. El incidente ya fue registrado
            para revisión. Intenta recargar la página.
          </p>
          <div className="flex gap-2 mt-6">
            <button
              onClick={this.handleRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recargar
            </button>
            <button
              onClick={this.handleReport}
              disabled={this.state.reported}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {this.state.reported ? 'Reportado ✓' : 'Reportar'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
