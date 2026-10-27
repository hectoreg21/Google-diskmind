import React from 'react';
import {
  HardDrive,
  Files,
  Database,
  Copy,
  Play,
  Pause,
  XCircle,
  AlertTriangle,
  FolderTree,
  ArrowRight,
  Info
} from 'lucide-react';
import { Disk, GlobalStats, ScanProgress } from '../types';
import { formatBytes, formatDate } from '../api';

interface DashboardViewProps {
  stats: GlobalStats | null;
  disks: Disk[];
  scanProgress: ScanProgress[];
  onSelectView: (view: string) => void;
  onSelectDisk: (diskId: string) => void;
  onPauseScan: (jobId: string) => void;
  onResumeScan: (jobId: string) => void;
  onCancelScan: (jobId: string) => void;
  onStartScan: (diskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  disks,
  scanProgress,
  onSelectView,
  onSelectDisk,
  onPauseScan,
  onResumeScan,
  onCancelScan,
  onStartScan
}) => {
  const activeJob = scanProgress.find(p => p.status === 'running' || p.status === 'paused');

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Panel de Control Multidisco
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Supervisión global de volúmenes físicos, catálogos offline persistentes y análisis de duplicados.
        </p>
      </div>

      {/* Info notice about Preview vs Local Hardware */}
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-cyan-200">
            Vista previa en AI Studio con catálogo de demostración multidisco
          </p>
          <p className="text-slate-400 leading-relaxed">
            Como el navegador no tiene acceso directo a tus puertos USB físicos, hemos precargado un catálogo
            realista con 5 discos (incluyendo discos desconectados y duplicados cruzados). Cuando ejecutes DiskMind
            localmente en tu PC (Windows 11 o Ubuntu), escaneará tus discos reales mediante el backend nativo.
          </p>
        </div>
      </div>

      {/* Active Scan Progress Card (if running) */}
      {activeJob && (
        <div className="p-5 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">
                Indexación en curso: {activeJob.status === 'paused' ? 'Pausado' : 'Escaneando archivos'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeJob.status === 'running' ? (
                <button
                  onClick={() => onPauseScan(activeJob.jobId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </button>
              ) : (
                <button
                  onClick={() => onResumeScan(activeJob.jobId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> Reanudar
                </button>
              )}
              <button
                onClick={() => onCancelScan(activeJob.jobId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>

          {/* Metric Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[11px] font-sans">Archivos procesados</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                {activeJob.filesScanned.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[11px] font-sans">Carpetas indexadas</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                {activeJob.foldersScanned.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[11px] font-sans">Volumen leído</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                {formatBytes(activeJob.bytesScanned)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[11px] font-sans">Velocidad</div>
              <div className="text-sm font-semibold text-cyan-400 tabular-nums mt-0.5">
                {activeJob.speedFilesPerSec} arch/seg
              </div>
            </div>
          </div>

          {/* Current Path */}
          <div className="text-xs text-slate-400 font-mono truncate bg-slate-950/90 p-2 rounded border border-slate-800/80">
            <span className="text-slate-600 font-sans mr-2">Ruta actual:</span>
            {activeJob.currentPath || 'Iniciando escaneo...'}
          </div>
        </div>
      )}

      {/* KPI Stat Cards (Single-Elevation, Unboxed figures, Tabular numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Disks */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Discos Registrados</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold font-mono tabular-nums text-white">
              {stats?.totalDisks ?? 0}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-emerald-400">{stats?.connectedDisks ?? 0} conectados</span>
              <span>·</span>
              <span className="text-amber-400">{stats?.disconnectedDisks ?? 0} desconectados</span>
            </div>
          </div>
        </div>

        {/* Card 2: Files */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Archivos Catalogados</span>
            <Files className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold font-mono tabular-nums text-white">
              {(stats?.totalFiles ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              en {(stats?.totalFolders ?? 0).toLocaleString()} carpetas en SQLite
            </div>
          </div>
        </div>

        {/* Card 3: Storage Cataloged */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Espacio Indexado</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold font-mono tabular-nums text-white">
              {formatBytes(stats?.totalCatalogedBytes ?? 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Estructura conservada offline
            </div>
          </div>
        </div>

        {/* Card 4: Duplicates & Wasted Space */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Espacio en Duplicados</span>
            <Copy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold font-mono tabular-nums text-amber-400">
              {formatBytes(stats?.totalWastedBytes ?? 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {stats?.duplicateGroupsCount ?? 0} grupos de duplicados exactos
            </div>
          </div>
        </div>
      </div>

      {/* Disks Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Estado de Discos Catalogados</h2>
          <button
            onClick={() => onSelectView('disks')}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            Administrar discos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {disks.map((disk) => {
            const usedBytes = disk.total_capacity_bytes - disk.free_space_bytes;
            const usedPercentage = disk.total_capacity_bytes > 0
              ? Math.min(100, Math.round((usedBytes / disk.total_capacity_bytes) * 100))
              : 0;
            const isOnline = disk.is_connected === 1;

            return (
              <div
                key={disk.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate" title={disk.custom_label}>
                        {disk.custom_label}
                      </div>
                      <div className="text-xs font-mono text-slate-500 truncate mt-0.5" title={disk.volume_uuid}>
                        UUID: {disk.volume_uuid.substring(0, 18)}...
                      </div>
                    </div>
                    {/* Status Badge: Quiet unboxed indicator */}
                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                        {isOnline ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>

                  {/* Mount Path */}
                  <div className="mt-3 text-xs text-slate-400 font-mono truncate bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    {disk.last_seen_mount_point}
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Uso físico ({usedPercentage}%)</span>
                      <span className="font-mono tabular-nums">
                        {formatBytes(usedBytes)} / {formatBytes(disk.total_capacity_bytes)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usedPercentage > 90 ? 'bg-red-500' : usedPercentage > 75 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${usedPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer with Catalog count & Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {disk.file_count ?? 0}
                    </span>{' '}
                    archivos en catálogo
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDisk(disk.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Explorar catálogo de este disco"
                    >
                      <FolderTree className="w-3 h-3 text-slate-400" />
                      <span>Explorar</span>
                    </button>
                    {isOnline && (
                      <button
                        onClick={() => onStartScan(disk.id)}
                        className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                        title="Reindexar incrementalmente"
                      >
                        Escanear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
