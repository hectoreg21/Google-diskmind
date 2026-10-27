import React, { useState } from 'react';
import {
  GitCompare,
  Folder,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FolderComparison } from '../types';
import { formatBytes } from '../api';

interface FoldersViewProps {
  comparisons: FolderComparison[];
}

export const FoldersView: React.FC<FoldersViewProps> = ({ comparisons }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = comparisons.filter(c => {
    if (filterType === 'all') return true;
    return c.relationType === filterType;
  });

  const getRelationBadge = (type: FolderComparison['relationType']) => {
    switch (type) {
      case 'identical':
        return {
          label: 'Carpetas 100% Idénticas',
          className: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
          icon: CheckCircle
        };
      case 'partial_duplicate':
        return {
          label: 'Parcialmente Duplicadas',
          className: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
          icon: AlertTriangle
        };
      case 'potential_version':
        return {
          label: 'Posible Versión Actualizada',
          className: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60',
          icon: GitBranch
        };
      case 'complementary':
        return {
          label: 'Colección Complementaria',
          className: 'text-purple-400 bg-purple-950/40 border-purple-800/60',
          icon: Layers
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Comparación y Relación Entre Carpetas
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detecta colecciones idénticas, duplicados parciales, carpetas complementarias y versiones entre distintos discos.
        </p>
      </div>

      {/* Filter Tabs (Interactive button segmented controls) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        {[
          { id: 'all', label: 'Todas las Relaciones' },
          { id: 'identical', label: 'Idénticas (100%)' },
          { id: 'partial_duplicate', label: 'Parcialmente Duplicadas' },
          { id: 'potential_version', label: 'Posibles Versiones' },
          { id: 'complementary', label: 'Complementarias' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterType === tab.id
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comparisons Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No se encontraron comparaciones de carpetas para el filtro seleccionado.
          </div>
        ) : (
          filtered.map((item) => {
            const badge = getRelationBadge(item.relationType);
            const Icon = badge.icon;
            const percentage = Math.round(item.similarityScore * 100);

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
              >
                {/* Header Row: Type Badge + Similarity Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.className}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Similitud: {percentage}%
                    </span>
                  </div>

                  {item.wastedBytesIfMerged > 0 && (
                    <div className="text-xs text-slate-400">
                      Redundancia común:{' '}
                      <strong className="text-amber-400 font-mono font-semibold">
                        {formatBytes(item.wastedBytesIfMerged)}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Explanation text */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.explanation}
                </p>

                {/* 2-Column Folder Pair Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  {/* Folder A */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Carpeta A</span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                        {item.folderA.diskLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate" title={item.folderA.name}>
                        {item.folderA.name}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 truncate" title={item.folderA.relativePath}>
                      /{item.folderA.relativePath}
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{item.folderA.fileCount} archivos</span>
                      <span>{formatBytes(item.folderA.totalSizeBytes)}</span>
                      <span className="text-cyan-400">{item.uniqueACount} únicos</span>
                    </div>
                  </div>

                  {/* Folder B */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Carpeta B</span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                        {item.folderB.diskLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate" title={item.folderB.name}>
                        {item.folderB.name}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 truncate" title={item.folderB.relativePath}>
                      /{item.folderB.relativePath}
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{item.folderB.fileCount} archivos</span>
                      <span>{formatBytes(item.folderB.totalSizeBytes)}</span>
                      <span className="text-indigo-400">{item.uniqueBCount} únicos</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
