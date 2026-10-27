import React from 'react';
import { HardDrive, ShieldCheck, RefreshCw, Cpu, Database, Search } from 'lucide-react';
import { OllamaStatus, GlobalStats } from '../types';

interface NavbarProps {
  stats: GlobalStats | null;
  ollamaStatus: OllamaStatus | null;
  onSyncDisks: () => void;
  isSyncing: boolean;
  onSelectView: (view: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  ollamaStatus,
  onSyncDisks,
  isSyncing,
  onSelectView,
  onOpenSearch
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between gap-8 shrink-0 z-20">
      {/* Zone 1: Wordmark & Architecture mode */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            DiskMind
            <span className="text-xs font-normal text-slate-400">· Organizador Multidisco Local</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Informational System Telemetry (Unboxed text with separators) */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Modo Solo Lectura (Activo)</span>
        </span>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>SQLite Persistente ({stats?.totalDisks ?? 0} discos)</span>
        </span>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <button
          onClick={() => onSelectView('ai')}
          className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 transition-colors"
          title="Ver estado de Ollama y aceleración GPU 1050M"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {ollamaStatus?.gpu?.name ? 'GPU GTX 1050M' : 'CPU'} · Ollama {ollamaStatus?.isOnline ? `Online (${ollamaStatus.models.length} modelos)` : 'No detectado'}
          </span>
        </button>
      </div>

      {/* Zone 3: Universal Search & Primary Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenSearch}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Búsqueda Universal en todos los discos (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Buscar archivo...</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-slate-900 px-1.5 py-0.2 rounded border border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={onSyncDisks}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          <span>Sincronizar Discos</span>
        </button>
      </div>
    </header>
  );
};
