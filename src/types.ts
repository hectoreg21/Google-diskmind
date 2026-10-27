export interface Disk {
  id: string;
  volume_uuid: string;
  custom_label: string;
  original_mount_point: string;
  last_seen_mount_point: string;
  total_capacity_bytes: number;
  free_space_bytes: number;
  is_connected: number;
  filesystem: string;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
  file_count?: number;
  total_size_bytes?: number;
  is_demo?: number;
}

export interface Folder {
  id: string;
  disk_id: string;
  parent_id: string | null;
  path: string;
  relative_path: string;
  name: string;
  file_count: number;
  total_size_bytes: number;
  mtime: string;
  depth: number;
}

export interface FileItem {
  id: string;
  disk_id: string;
  folder_id: string;
  name: string;
  extension: string;
  relative_path: string;
  size_bytes: number;
  mtime: string;
  ctime: string;
  partial_hash: string | null;
  full_hash: string | null;
  is_archived: number;
  last_verified_at: string;
  disk_label?: string;
}

export interface GlobalStats {
  totalDisks: number;
  connectedDisks: number;
  disconnectedDisks: number;
  totalFiles: number;
  totalFolders: number;
  totalCatalogedBytes: number;
  duplicateGroupsCount: number;
  totalWastedBytes: number;
}

export interface DuplicateGroup {
  hash: string;
  sizeBytes: number;
  fileCount: number;
  wastedBytes: number;
  files: {
    id: string;
    diskId: string;
    diskLabel: string;
    isDiskConnected: boolean;
    name: string;
    relativePath: string;
    extension: string;
    sizeBytes: number;
    mtime: string;
    fullHash: string | null;
  }[];
}

export interface DuplicateAnalysisSummary {
  stage1CandidateSizesCount: number;
  stage1CandidateFilesCount: number;
  stage2PartialHashGroupsCount: number;
  stage3ConfirmedGroupsCount: number;
  totalDuplicateFiles: number;
  totalWastedBytes: number;
  groups: DuplicateGroup[];
}

export interface FolderComparison {
  id: string;
  folderA: {
    id: string;
    diskId: string;
    diskLabel: string;
    isDiskConnected: boolean;
    name: string;
    relativePath: string;
    fileCount: number;
    totalSizeBytes: number;
  };
  folderB: {
    id: string;
    diskId: string;
    diskLabel: string;
    isDiskConnected: boolean;
    name: string;
    relativePath: string;
    fileCount: number;
    totalSizeBytes: number;
  };
  relationType: 'identical' | 'partial_duplicate' | 'potential_version' | 'complementary';
  similarityScore: number;
  commonFilesCount: number;
  uniqueACount: number;
  uniqueBCount: number;
  wastedBytesIfMerged: number;
  explanation: string;
}

export interface ScanProgress {
  jobId: string;
  diskId: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  filesScanned: number;
  foldersScanned: number;
  bytesScanned: number;
  errorCount: number;
  currentPath: string;
  startedAt: string;
  elapsedSeconds: number;
  speedFilesPerSec: number;
}

export interface Incident {
  id: string;
  scan_job_id: string;
  disk_id: string;
  file_path: string;
  error_code: string;
  error_message: string;
  timestamp: string;
}

export interface GpuInfo {
  detected: boolean;
  name?: string;
  totalVramMB?: number;
  freeVramMB?: number;
  driverVersion?: string;
  cudaSupported: boolean;
  recommendedModel: string;
  advice: string;
}

export interface OllamaStatus {
  isOnline: boolean;
  endpoint: string;
  version?: string;
  models: {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    parameter_size?: string;
  }[];
  selectedModel: string | null;
  errorMessage?: string;
  suggestedModels: string[];
  gpu?: GpuInfo;
}

export interface UniversalSearchResult {
  id: string;
  name: string;
  extension: string;
  size_bytes: number;
  relative_path: string;
  mtime: string;
  full_hash: string | null;
  disk_id: string;
  disk_label: string;
  disk_mount_point: string;
  is_disk_connected: number;
  is_duplicate: boolean;
  location_instruction: string;
}

export interface DiskAuditReport {
  diskId: string;
  diskLabel: string;
  isConnected: boolean;
  totalCatalogedFiles: number;
  verifiedFilesOnDisk: number;
  missingFilesCount: number;
  modifiedFilesCount: number;
  checkedSampleCount: number;
  status: 'healthy' | 'discrepancies_found' | 'disk_offline';
  details: string;
  discrepancies: { name: string; relative_path: string; issue: string }[];
}
