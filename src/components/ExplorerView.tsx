import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Folder,
  FolderOpen,
  File,
  Search,
  HardDrive,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Info,
  Download,
  Sparkles,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Disk, Folder as FolderType, FileItem } from '../types';
import { api, formatBytes, formatDate } from '../api';

interface ExplorerViewProps {
  disks: Disk[];
  selectedDiskId: string | null;
  onSelectDiskId: (id: string | null) => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  disks,
  selectedDiskId,
  onSelectDiskId
}) => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Ollama folder summary modal state
  const [summarizingFolder, setSummarizingFolder] = useState<FolderType | null>(null);
  const [summaryResult, setSummaryResult] = useState<{
    isLiveAi: boolean;
    modelUsed: string;
    summary: string;
    durationMs: number;
  } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const currentDisk = disks.find(d => d.id === selectedDiskId);

  // Load folder tree when selected disk changes
  useEffect(() => {
    let isMounted = true;
    const fetchTree = async () => {
      try {
        const data = await api.getFolderTree(selectedDiskId || undefined);
        if (isMounted) {
          setFolders(data);
          // Auto-expand top-level folders
          const topIds = new Set(data.filter(f => f.depth <= 1).map(f => f.id));
          setExpandedFolders(topIds);
          // Reset selected folder
          setSelectedFolderId(null);
        }
      } catch (err) {
        console.error('Error fetching folder tree:', err);
      }
    };
    fetchTree();
    return () => { isMounted = false; };
  }, [selectedDiskId]);

  // Load files when filters change
  useEffect(() => {
    let isMounted = true;
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const res = await api.getFiles({
          diskId: selectedDiskId || undefined,
          folderId: selectedFolderId || undefined,
          search: searchQuery || undefined,
          extension: selectedExtension !== 'all' ? selectedExtension : undefined,
          limit: 100
        });
        if (isMounted) {
          setFiles(res.files);
          setTotalFiles(res.total);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchFiles, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDiskId, selectedFolderId, searchQuery, selectedExtension]);

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSummarizeFolder = async (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setSummarizingFolder(folder);
    setIsSummarizing(true);
    setSummaryResult(null);
    try {
      const res = await api.summarizeFolder(folder.id);
      setSummaryResult(res);
    } catch (err: any) {
      console.error('Error summarizing folder:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const commonExtensions = ['all', 'arw', 'iso', 'mkv', 'pdf', 'zip', 'gz', 'json', 'ts'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Explorador Global de Catálogos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Examina la jerarquía completa de carpetas y archivos, incluso de discos duros desconectados.
          </p>
        </div>

        {/* Disk filter selector & Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDiskId || 'all'}
            onChange={(e) => onSelectDiskId(e.target.value === 'all' ? null : e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos los discos catalogados ({disks.length})</option>
            {disks.map(d => (
              <option key={d.id} value={d.id}>
                {d.custom_label} {d.is_connected === 1 ? '[Online]' : '[Offline]'}
              </option>
            ))}
          </select>

          {selectedDiskId && (
            <div className="flex items-center gap-1.5">
              <a
                href={api.getDiskExportUrl(selectedDiskId, 'csv')}
                download
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                title="Exportar inventario de este disco a CSV (compatible con Excel)"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>CSV</span>
              </a>
              <a
                href={api.getDiskExportUrl(selectedDiskId, 'json')}
                download
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                title="Exportar catálogo estructurado a JSON"
              >
                <Download className="w-3 h-3 text-indigo-400" />
                <span>JSON</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Disconnected Disk Offline Banner */}
      {currentDisk && currentDisk.is_connected === 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 space-y-0.5">
            <span className="font-semibold">Navegación fuera de línea activa</span>
            <p className="text-slate-400">
              El disco &ldquo;{currentDisk.custom_label}&rdquo; está físicamente desconectado.
              Estás visualizando su estructura completa a través del catálogo persistente en SQLite.
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Pane Explorer Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Pane: Folder Tree (col-span-4) */}
        <div className="lg:col-span-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
              <span>Estructura de Carpetas</span>
            </span>
            <button
              onClick={() => setSelectedFolderId(null)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Ver todas ({folders.length})
            </button>
          </div>

          <div className="p-2 overflow-y-auto max-h-[550px] space-y-0.5 text-xs">
            {folders.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No hay carpetas catalogadas para este filtro.
              </div>
            ) : (
              folders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                const isExpanded = expandedFolders.has(folder.id);

                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    style={{ paddingLeft: `${Math.min(folder.depth * 14, 80) + 8}px` }}
                    className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <button
                        type="button"
                        onClick={(e) => toggleFolderExpand(folder.id, e)}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {isSelected ? (
                        <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="truncate" title={folder.relative_path}>
                        {folder.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <button
                        onClick={(e) => handleSummarizeFolder(folder, e)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                        title="Resumir contenido con IA local (Ollama)"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono tabular-nums text-slate-500">
                        {folder.file_count}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Files Table (col-span-8) */}
        <div className="lg:col-span-8 rounded-xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre o ruta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Extension Pills */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-0.5">
              {commonExtensions.map((ext) => (
                <button
                  key={ext}
                  onClick={() => setSelectedExtension(ext)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors shrink-0 uppercase cursor-pointer ${
                    selectedExtension === ext
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ext}
                </button>
              ))}
            </div>
          </div>

          {/* Files List Table */}
          <div className="overflow-x-auto flex-1 max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">Disco</th>
                  <th className="px-3 py-2.5 text-right">Tamaño</th>
                  <th className="px-3 py-2.5">Ruta Relativa</th>
                  <th className="px-3 py-2.5">Hash SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Cargando catálogo...
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No se encontraron archivos en este criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-2.5 flex items-center gap-2 max-w-[240px]">
                        <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate font-medium text-slate-100" title={file.name}>
                          {file.name}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-slate-400 truncate max-w-[140px]">
                        {file.disk_label || 'Desconocido'}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        {formatBytes(file.size_bytes)}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400 truncate max-w-[200px]" title={file.relative_path}>
                        {file.relative_path}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {file.full_hash ? (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400"
                            title={`SHA-256: ${file.full_hash}`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{file.full_hash.substring(0, 10)}...</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span>
              Mostrando <strong className="text-slate-200 tabular-nums">{files.length}</strong> de{' '}
              <strong className="text-slate-200 tabular-nums">{totalFiles}</strong> archivos
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Lectura directa desde SQLite WAL
            </span>
          </div>
        </div>
      </div>

      {/* Ollama Folder Summary Modal */}
      {summarizingFolder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Resumen Semántico Local: &ldquo;{summarizingFolder.name}&rdquo;
                </h2>
              </div>
              <button
                onClick={() => setSummarizingFolder(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400 space-y-1">
              <div>Ruta: /{summarizingFolder.relative_path}</div>
              <div>Archivos indexados: {summarizingFolder.file_count} · {formatBytes(summarizingFolder.total_size_bytes)}</div>
            </div>

            {isSummarizing ? (
              <div className="p-8 text-center space-y-2 text-xs text-slate-400">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                <p>Generando resumen semántico con Ollama en localhost:11434...</p>
              </div>
            ) : summaryResult ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Motor: {summaryResult.modelUsed}</span>
                    <span>{summaryResult.durationMs} ms</span>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {summaryResult.summary}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                onClick={() => setSummarizingFolder(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
