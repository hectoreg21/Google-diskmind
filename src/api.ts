import {
  Disk,
  Folder,
  FileItem,
  GlobalStats,
  DuplicateAnalysisSummary,
  FolderComparison,
  ScanProgress,
  Incident,
  OllamaStatus,
  UniversalSearchResult,
  DiskAuditReport,
  GpuInfo
} from './types';

export const api = {
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  async getStats(): Promise<GlobalStats> {
    const res = await fetch('/api/stats');
    return res.json();
  },

  async getDisks(): Promise<Disk[]> {
    const res = await fetch('/api/disks');
    return res.json();
  },

  async syncDisks(): Promise<{ success: boolean; disks: Disk[] }> {
    const res = await fetch('/api/disks/sync', { method: 'POST' });
    return res.json();
  },

  async detectSystemDrives(): Promise<any[]> {
    const res = await fetch('/api/disks/detect-system');
    return res.json();
  },

  async registerDisk(data: {
    customLabel: string;
    mountPoint: string;
    totalCapacityBytes?: number;
    freeSpaceBytes?: number;
    filesystem?: string;
  }): Promise<Disk> {
    const res = await fetch('/api/disks/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar disco');
    }
    return res.json();
  },

  async updateDisk(id: string, data: { customLabel?: string; mountPoint?: string }): Promise<Disk> {
    const res = await fetch(`/api/disks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async toggleDiskConnection(id: string): Promise<{ id: string; is_connected: number }> {
    const res = await fetch(`/api/disks/${id}/toggle-connection`, { method: 'POST' });
    return res.json();
  },

  async getFolderTree(diskId?: string): Promise<Folder[]> {
    const url = diskId ? `/api/explorer/tree?diskId=${encodeURIComponent(diskId)}` : '/api/explorer/tree';
    const res = await fetch(url);
    return res.json();
  },

  async getFiles(params: {
    diskId?: string;
    folderId?: string;
    search?: string;
    extension?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ files: FileItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params.diskId) query.set('diskId', params.diskId);
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.search) query.set('search', params.search);
    if (params.extension) query.set('extension', params.extension);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const res = await fetch(`/api/explorer/files?${query.toString()}`);
    return res.json();
  },

  async startScan(data: {
    diskId: string;
    targetPath?: string;
    isIncremental?: boolean;
    computeHashesImmediately?: boolean;
  }): Promise<{ success: boolean; jobId: string }> {
    const res = await fetch('/api/scan/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al iniciar escaneo');
    }
    return res.json();
  },

  async pauseScan(jobId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/scan/${jobId}/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeScan(jobId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/scan/${jobId}/resume`, { method: 'POST' });
    return res.json();
  },

  async cancelScan(jobId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/scan/${jobId}/cancel`, { method: 'POST' });
    return res.json();
  },

  async getScanProgress(): Promise<ScanProgress[]> {
    const res = await fetch('/api/scan/progress');
    return res.json();
  },

  async getIncidents(): Promise<Incident[]> {
    const res = await fetch('/api/scan/incidents');
    return res.json();
  },

  async getDuplicates(): Promise<DuplicateAnalysisSummary> {
    const res = await fetch('/api/duplicates');
    return res.json();
  },

  async computeHashes(maxFiles = 100): Promise<{
    partialHashesComputed: number;
    fullHashesComputed: number;
    confirmedDuplicatesFound: number;
  }> {
    const res = await fetch('/api/duplicates/compute-hashes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxFiles })
    });
    return res.json();
  },

  async getFolderComparisons(): Promise<FolderComparison[]> {
    const res = await fetch('/api/folders/compare');
    return res.json();
  },

  async getDiskBreakdown(diskId: string): Promise<{
    categories: { category: string; file_count: number; total_bytes: number }[];
    topHeavyFolders: { name: string; relative_path: string; total_size_bytes: number; file_count: number }[];
  }> {
    const res = await fetch(`/api/disks/${diskId}/breakdown`);
    return res.json();
  },

  async summarizeFolder(folderId: string, model?: string): Promise<{
    isLiveAi: boolean;
    modelUsed: string;
    prompt: string;
    summary: string;
    durationMs: number;
  }> {
    const res = await fetch('/api/ollama/summarize-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, model })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al resumir carpeta');
    }
    return res.json();
  },

  getDiskExportUrl(diskId: string, format: 'csv' | 'json' = 'csv'): string {
    return `/api/disks/${diskId}/export?format=${format}`;
  },

  async searchUniversal(q: string): Promise<UniversalSearchResult[]> {
    if (!q.trim()) return [];
    const res = await fetch(`/api/explorer/universal-search?q=${encodeURIComponent(q.trim())}`);
    return res.json();
  },

  async auditDisk(diskId: string): Promise<DiskAuditReport> {
    const res = await fetch(`/api/disks/${diskId}/audit`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al auditar integridad');
    }
    return res.json();
  },

  async getGpuInfo(): Promise<GpuInfo> {
    const res = await fetch('/api/system/gpu');
    return res.json();
  },

  async getOllamaStatus(): Promise<OllamaStatus> {
    const res = await fetch('/api/ollama/status');
    return res.json();
  },

  async testOllama(prompt: string, model?: string): Promise<{ text: string; durationMs: number }> {
    const res = await fetch('/api/ollama/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en prueba de Ollama');
    }
    return res.json();
  },

  async resetDemo(): Promise<void> {
    await fetch('/api/demo/reset', { method: 'POST' });
  }
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Nunca';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}
