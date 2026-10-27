import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  HardDrive,
  File,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft
} from 'lucide-react';
import { UniversalSearchResult } from '../types';
import { api, formatBytes, formatDate } from '../api';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (diskId: string, filePath: string) => void;
}

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.searchUniversal(query);
        setResults(data);
      } catch (err) {
        console.error('Error in universal search:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, extensión o ruta en todos los discos (online y offline)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Buscando en catálogo SQLite...
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontró ningún archivo con el término &ldquo;{query}&rdquo;.
            </div>
          ) : !query.trim() ? (
            <div className="p-8 text-center space-y-2 text-xs text-slate-500">
              <p className="font-semibold text-slate-400">Buscador Universal Multidisco</p>
              <p>
                Localiza archivos inmediatamente y averigua en qué disco físico se encuentran y si están conectados o en un cajón.
              </p>
              <div className="pt-2 flex justify-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">.arw (RAW)</span>
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">.iso</span>
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">.mkv</span>
                <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">.pdf</span>
              </div>
            </div>
          ) : (
            results.map((item) => {
              const isOnline = item.is_disk_connected === 1;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult(item.disk_id, item.relative_path);
                    onClose();
                  }}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-sm font-semibold text-white truncate" title={item.name}>
                        {item.name}
                      </span>
                      {item.is_duplicate && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50 shrink-0">
                          <Copy className="w-2.5 h-2.5" />
                          <span>Duplicado</span>
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-xs tabular-nums text-slate-300 font-semibold shrink-0">
                      {formatBytes(item.size_bytes)}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 truncate">
                    /{item.relative_path}
                  </div>

                  {/* Physical Location Instruction */}
                  <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-medium ${
                        isOnline ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.location_instruction}</span>
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>Ver en explorador</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between px-4">
          <span>{results.length} coincidencias encontradas</span>
          <span>Presiona ESC para cerrar</span>
        </div>
      </div>
    </div>
  );
};
