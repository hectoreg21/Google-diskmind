import React, { useState } from 'react';
import {
  HardDrive,
  FolderTree,
  Play,
  Edit2,
  Check,
  X,
  Plus,
  RefreshCw,
  Power,
  Shield,
  Layers,
  Info,
  Download,
  BarChart3,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Disk, DiskAuditReport } from '../types';
import { api, formatBytes, formatDate } from '../api';

interface DisksViewProps {
  disks: Disk[];
  onStartScan: (diskId: string, isIncremental?: boolean) => void;
  onToggleConnection: (diskId: string) => void;
  onUpdateLabel: (diskId: string, newLabel: string) => void;
  onRegisterDisk: (data: {
    customLabel: string;
    mountPoint: string;
    totalCapacityBytes?: number;
    freeSpaceBytes?: number;
    filesystem?: string;
  }) => void;
  onExploreDisk: (diskId: string) => void;
}

export const DisksView: React.FC<DisksViewProps> = ({
  disks,
  onStartScan,
  onToggleConnection,
  onUpdateLabel,
  onRegisterDisk,
  onExploreDisk
}) => {
  const [editingDiskId, setEditingDiskId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCapacityGB, setNewCapacityGB] = useState('1000');
  const [newFs, setNewFs] = useState('NTFS');

  // Space distribution breakdown modal state
  const [breakdownDisk, setBreakdownDisk] = useState<Disk | null>(null);
  const [breakdownData, setBreakdownData] = useState<{
    categories: { category: string; file_count: number; total_bytes: number }[];
    topHeavyFolders: { name: string; relative_path: string; total_size_bytes: number; file_count: number }[];
  } | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

  // Disk integrity audit modal state
  const [auditReport, setAuditReport] = useState<DiskAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleRunAudit = async (diskId: string) => {
    setIsAuditing(true);
    setAuditReport(null);
    try {
      const report = await api.auditDisk(diskId);
      setAuditReport(report);
    } catch (err: any) {
      alert(err.message || 'Error al ejecutar auditoría');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleOpenBreakdown = async (disk: Disk) => {
    setBreakdownDisk(disk);
    setIsLoadingBreakdown(true);
    try {
      const data = await api.getDiskBreakdown(disk.id);
      setBreakdownData(data);
    } catch (err) {
      console.error('Error fetching breakdown:', err);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const handleStartEdit = (disk: Disk) => {
    setEditingDiskId(disk.id);
    setEditLabelValue(disk.custom_label);
  };

  const handleSaveEdit = (diskId: string) => {
    if (editLabelValue.trim()) {
      onUpdateLabel(diskId, editLabelValue.trim());
    }
    setEditingDiskId(null);
  };

  const handleCreateDisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath) return;

    const capacityBytes = parseInt(newCapacityGB) * 1024 * 1024 * 1024 || 1000 * 1024 * 1024 * 1024;
    onRegisterDisk({
      customLabel: newLabel || newPath,
      mountPoint: newPath,
      totalCapacityBytes: capacityBytes,
      freeSpaceBytes: Math.floor(capacityBytes * 0.4),
      filesystem: newFs
    });

    setShowAddModal(false);
    setNewPath('');
    setNewLabel('');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gestión e Identificación de Discos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra volúmenes USB externos, reconoce cambios de letra o punto de montaje y preserva catálogos offline.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Disco o Ruta</span>
        </button>
      </div>

      {/* Persistence Safety Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
        <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">
            Persistencia garantizada ante desconexión
          </p>
          <p className="text-slate-400 leading-relaxed">
            DiskMind identifica cada disco por su identificador de volumen (UUID). Si expulsas o desconectas un disco,
            su estado pasará a &ldquo;Desconectado&rdquo;, pero todos sus archivos, carpetas y hashes permanecerán
            completamente indexados y consultables en SQLite. Si lo reconectas con otra letra de unidad (p. ej. de E: a F:),
            DiskMind actualizará su ubicación automáticamente sin duplicar el catálogo.
          </p>
        </div>
      </div>

      {/* Disks Grid */}
      <div className="grid grid-cols-1 gap-4">
        {disks.map((disk) => {
          const usedBytes = disk.total_capacity_bytes - disk.free_space_bytes;
          const usedPercentage = disk.total_capacity_bytes > 0
            ? Math.min(100, Math.round((usedBytes / disk.total_capacity_bytes) * 100))
            : 0;
          const isOnline = disk.is_connected === 1;
          const isEditing = editingDiskId === disk.id;

          return (
            <div
              key={disk.id}
              className={`p-5 rounded-xl border transition-colors ${
                isOnline ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-900/50 border-slate-800/60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isOnline
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <HardDrive className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            className="px-2 py-1 text-sm bg-slate-950 border border-cyan-500 rounded text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(disk.id)}
                            className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                            title="Guardar nombre"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDiskId(null)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white truncate">
                            {disk.custom_label}
                          </span>
                          <button
                            onClick={() => handleStartEdit(disk)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                            title="Editar nombre personalizado"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Connection status tag */}
                      <span
                        className={`text-xs font-medium inline-flex items-center gap-1.5 ${
                          isOnline ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {isOnline ? 'Conectado (Online)' : 'Desconectado (Offline - Catálogo activo)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>UUID: {disk.volume_uuid}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>FS: {disk.filesystem}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="truncate">Ruta: {disk.last_seen_mount_point}</span>
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap">
                  <button
                    onClick={() => handleOpenBreakdown(disk)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Ver categorías de archivos y carpetas más pesadas"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Distribución</span>
                  </button>

                  <a
                    href={api.getDiskExportUrl(disk.id, 'csv')}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Exportar inventario de este disco a archivo CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>CSV</span>
                  </a>

                  <button
                    onClick={() => handleRunAudit(disk.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Verificar discrepancias físicas frente al catálogo SQLite"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auditar</span>
                  </button>

                  <button
                    onClick={() => onToggleConnection(disk.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isOnline
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                    }`}
                    title={isOnline ? 'Simular desconexión USB' : 'Simular reconexión USB'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isOnline ? 'Desconectar' : 'Reconectar'}</span>
                  </button>

                  <button
                    onClick={() => onExploreDisk(disk.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                    <span>Explorar</span>
                  </button>

                  <button
                    onClick={() => onStartScan(disk.id, true)}
                    disabled={!isOnline}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Escanear</span>
                  </button>
                </div>
              </div>

              {/* Progress & Storage Statistics */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Column 1: Capacity Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Espacio en disco ({usedPercentage}% ocupado)</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      {formatBytes(usedBytes)} / {formatBytes(disk.total_capacity_bytes)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usedPercentage > 90 ? 'bg-red-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${usedPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Column 2: Files in SQLite */}
                <div className="flex flex-col justify-center">
                  <span className="text-slate-400">Archivos en base de datos SQLite</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-200 mt-0.5">
                    {disk.file_count ?? 0} archivos ({formatBytes(disk.total_size_bytes ?? 0)})
                  </span>
                </div>

                {/* Column 3: Last scan */}
                <div className="flex flex-col justify-center">
                  <span className="text-slate-400">Última catalogación</span>
                  <span className="font-mono tabular-nums text-slate-300 mt-0.5">
                    {formatDate(disk.last_scanned_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Register New Disk or Folder */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Registrar Disco o Carpeta Local</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDisk} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Ruta de Montaje o Carpeta Raíz
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: D:\ o /media/usuario/MiDisco"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  En Windows: letras de unidad (D:\, E:\). En Linux: puntos de montaje (/media/...).
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Nombre Personalizado del Disco
                </label>
                <input
                  type="text"
                  placeholder="Ej: Backup Fotos Familiares 2024"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Capacidad estimada (GB)</label>
                  <input
                    type="number"
                    value={newCapacityGB}
                    onChange={(e) => setNewCapacityGB(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Sistema de archivos</label>
                  <select
                    value={newFs}
                    onChange={(e) => setNewFs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="NTFS">NTFS</option>
                    <option value="exFAT">exFAT</option>
                    <option value="ext4">ext4</option>
                    <option value="FAT32">FAT32</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm"
                >
                  Guardar y Catalogar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Space Distribution Breakdown (Treemap/Categories) */}
      {breakdownDisk && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">
                  Distribución de Espacio: {breakdownDisk.custom_label}
                </h2>
              </div>
              <button
                onClick={() => setBreakdownDisk(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingBreakdown ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Calculando distribución de almacenamiento...
              </div>
            ) : breakdownData ? (
              <div className="space-y-5 text-xs">
                {/* Categories bar */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Especialización por Tipos de Contenido
                  </div>
                  <div className="space-y-2">
                    {breakdownData.categories.map((cat) => {
                      const totalBytes = breakdownDisk.total_size_bytes || 1;
                      const pct = Math.min(100, Math.round((cat.total_bytes / totalBytes) * 100));

                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span className="font-medium">{cat.category}</span>
                            <span className="font-mono tabular-nums text-slate-400">
                              {formatBytes(cat.total_bytes)} ({cat.file_count} archivos · {pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan-500 transition-all"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Heavy Folders */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Carpetas que Mayor Espacio Consumen en este Disco
                  </div>
                  <div className="divide-y divide-slate-800/60 rounded-lg bg-slate-950/70 border border-slate-800 overflow-hidden">
                    {breakdownData.topHeavyFolders.map((f, i) => (
                      <div key={i} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{f.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">/{f.relative_path}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-semibold text-cyan-300 tabular-nums">
                            {formatBytes(f.total_size_bytes)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {f.file_count} archivos
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex justify-between items-center border-t border-slate-800/80">
              <a
                href={api.getDiskExportUrl(breakdownDisk.id, 'csv')}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar Inventario Completo (CSV)</span>
              </a>

              <button
                onClick={() => setBreakdownDisk(null)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Disk Integrity Audit Report */}
      {auditReport && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Auditoría de Integridad: {auditReport.diskLabel}
                </h2>
              </div>
              <button
                onClick={() => setAuditReport(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status card */}
            <div
              className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                auditReport.status === 'healthy'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : auditReport.status === 'disk_offline'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-red-950/40 border-red-800/60 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {auditReport.status === 'healthy' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {auditReport.status === 'disk_offline' && <Info className="w-4 h-4 text-amber-400" />}
                {auditReport.status === 'discrepancies_found' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                <span>
                  {auditReport.status === 'healthy'
                    ? 'Catálogo 100% Sincronizado con Disco Físico'
                    : auditReport.status === 'disk_offline'
                    ? 'Disco Físicamente Desconectado (Catálogo Protegido)'
                    : 'Discrepancias Externas Detectadas'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                {auditReport.details}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] font-sans">Archivos Verificados</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {auditReport.verifiedFilesOnDisk}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] font-sans">No Encontrados</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {auditReport.missingFilesCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500 text-[10px] font-sans">Modificados Externamente</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">
                  {auditReport.modifiedFilesCount}
                </div>
              </div>
            </div>

            {/* Discrepancies details if any */}
            {auditReport.discrepancies.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Detalle de discrepancias detectadas:
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {auditReport.discrepancies.map((d, i) => (
                    <div key={i} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-0.5">
                      <div className="font-semibold text-white truncate">{d.name}</div>
                      <div className="text-[11px] text-amber-400 font-sans">{d.issue}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{d.relative_path}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-800/80">
              <button
                onClick={() => setAuditReport(null)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
