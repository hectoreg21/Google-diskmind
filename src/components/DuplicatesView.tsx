import React, { useState } from 'react';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cpu,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { DuplicateAnalysisSummary } from '../types';
import { formatBytes, formatDate } from '../api';

interface DuplicatesViewProps {
  duplicates: DuplicateAnalysisSummary | null;
  onComputeHashes: () => void;
  isComputing: boolean;
}

export const DuplicatesView: React.FC<DuplicatesViewProps> = ({
  duplicates,
  onComputeHashes,
  isComputing
}) => {
  const [expandedGroupHash, setExpandedGroupHash] = useState<string | null>(null);

  const toggleGroup = (hash: string) => {
    setExpandedGroupHash(prev => (prev === hash ? null : hash));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Detección de Archivos Duplicados por Etapas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Algoritmo de 3 fases: tamaño idéntico &rarr; hash parcial &rarr; confirmación criptográfica SHA-256.
          </p>
        </div>

        <button
          onClick={onComputeHashes}
          disabled={isComputing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Cpu className={`w-4 h-4 ${isComputing ? 'animate-spin' : ''}`} />
          <span>{isComputing ? 'Calculando Hashes...' : 'Procesar Hashes en Discos Conectados'}</span>
        </button>
      </div>

      {/* 3-Stage Detection Pipeline Architecture Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Arquitectura del Pipeline de Deduplicación
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Stage 1 */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Etapa 1: Filtro por Tamaño</span>
              <span className="text-cyan-400 font-mono font-semibold">100% no invasivo</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Agrupa archivos con tamaño idéntico exacto. Descarta de inmediato los archivos de tamaño único sin leer sus contenidos.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
              <span>Candidatos detectados:</span>
              <span className="font-mono tabular-nums text-slate-200 font-semibold">
                {duplicates?.stage1CandidateFilesCount ?? 0} archivos
              </span>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Etapa 2: Hash Parcial</span>
              <span className="text-indigo-400 font-mono font-semibold">4KB inicial + 4KB final</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Lee únicamente los bloques inicial y final del archivo para descartar el 95% de falsos positivos en ficheros grandes sin saturar el bus USB.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
              <span>Grupos preseleccionados:</span>
              <span className="font-mono tabular-nums text-slate-200 font-semibold">
                {duplicates?.stage2PartialHashGroupsCount ?? 0} grupos
              </span>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-emerald-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300">Etapa 3: SHA-256 Completo</span>
              <span className="text-emerald-400 font-mono font-semibold">Verificación exacta</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Calcula el hash criptográfico del contenido completo. Solo los archivos con hash 100% coincidente se consideran duplicados reales.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
              <span>Duplicados confirmados:</span>
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                {duplicates?.stage3ConfirmedGroupsCount ?? 0} grupos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Reclaimable Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-amber-900/30">
          <span className="text-xs font-medium text-slate-400">Espacio Redundante Reclamable</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-400 mt-2">
            {formatBytes(duplicates?.totalWastedBytes ?? 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Espacio que se recuperaría al conservar 1 copia única
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Grupos de Duplicados Exactos</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-white mt-2">
            {duplicates?.stage3ConfirmedGroupsCount ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Identificados inequívocamente por SHA-256
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Copias Redundantes Detectadas</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-white mt-2">
            {duplicates?.totalDuplicateFiles ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Distribuidas a lo largo de múltiples discos USB
          </p>
        </div>
      </div>

      {/* Confirmed Duplicates List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Grupos de Duplicados Confirmados ({duplicates?.groups.length ?? 0})
        </h2>

        {!duplicates || duplicates.groups.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No se han confirmado duplicados aún. Pulsa &ldquo;Procesar Hashes en Discos Conectados&rdquo; para calcular hashes criptográficos.
          </div>
        ) : (
          <div className="space-y-3">
            {duplicates.groups.map((group, idx) => {
              const isExpanded = expandedGroupHash === group.hash;
              const sampleName = group.files[0]?.name || 'Archivo duplicado';

              return (
                <div
                  key={group.hash}
                  className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors hover:border-slate-700"
                >
                  {/* Group Summary Row */}
                  <div
                    onClick={() => toggleGroup(group.hash)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Copy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-sm font-semibold text-white truncate" title={sampleName}>
                          {sampleName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <span title={group.hash}>SHA-256: {group.hash.substring(0, 16)}...</span>
                          <span>·</span>
                          <span>{group.fileCount} copias idénticas</span>
                          <span>·</span>
                          <span>{formatBytes(group.sizeBytes)} c/u</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Espacio desperdiciado</div>
                        <div className="text-sm font-bold font-mono tabular-nums text-amber-400">
                          {formatBytes(group.wastedBytes)}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-slate-400 hover:text-white p-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Copies List */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Ubicación física de cada copia
                      </div>

                      <div className="divide-y divide-slate-800/60">
                        {group.files.map((file, fIdx) => (
                          <div
                            key={file.id}
                            className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="font-semibold text-slate-200">
                                  {file.diskLabel}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                    file.isDiskConnected
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                  }`}
                                >
                                  {file.isDiskConnected ? 'Online' : 'Offline'}
                                </span>
                                {fIdx === 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    [Copia Principal Propuesta]
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-slate-400 text-[11px] truncate" title={file.relativePath}>
                                {file.relativePath}
                              </div>
                            </div>

                            <div className="text-right text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                              Modificado: {formatDate(file.mtime)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
