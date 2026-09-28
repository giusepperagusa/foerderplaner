import React from 'react';
import { RefreshCw, Sparkles, X, ArrowUpCircle } from 'lucide-react';

interface Props {
  needRefresh: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateToast: React.FC<Props> = ({ needRefresh, onUpdate, onDismiss }) => {
  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-indigo-500/30 flex items-start gap-3.5 animate-in slide-in-from-bottom-5">
      <div className="p-2.5 bg-indigo-600/30 rounded-xl text-indigo-400 shrink-0 mt-0.5">
        <ArrowUpCircle className="w-5 h-5 text-indigo-300" />
      </div>

      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-indigo-200 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Neues Update verfügbar
          </span>
          <button 
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-0.5 rounded-md"
            title="Später erinnern"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-snug">
          Eine aktualisierte Version der Anwendung wurde im Hintergrund bereitgestellt.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onUpdate}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Jetzt aktualisieren</span>
          </button>
          <button
            onClick={onDismiss}
            className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
};
