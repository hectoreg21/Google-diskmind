import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbInstance, FileRecord, FolderRecord, ScanJobRecord } from '../db/database.ts';

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

export class Scanner {
  private activeJobs: Map<string, {
    job: ScanJobRecord;
    isPaused: boolean;
    isCancelled: boolean;
    pausePromise: Promise<void> | null;
    resumeResolver: (() => void) | null;
  }> = new Map();

  /**
   * Computes a partial hash (first 4KB + last 4KB) for candidate files.
   * Very fast, eliminates 95%+ of false matches on large files.
   */
  public async computePartialHash(filePath: string, sizeBytes: number): Promise<string | null> {
    try {
      if (sizeBytes <= 0) return 'empty_file_0bytes';
      const chunkSize = 4096;
      const buffer = Buffer.alloc(Math.min(chunkSize * 2, sizeBytes));

      const fd = await fs.promises.open(filePath, 'r');
      try {
        if (sizeBytes <= chunkSize * 2) {
          // Read entire file if smaller than 8KB
          await fd.read(buffer, 0, sizeBytes, 0);
          return crypto.createHash('sha256').update(buffer.subarray(0, sizeBytes)).digest('hex');
        } else {
          // Read first 4KB
          await fd.read(buffer, 0, chunkSize, 0);
          // Read last 4KB
          await fd.read(buffer, chunkSize, chunkSize, sizeBytes - chunkSize);
          return crypto.createHash('sha256').update(buffer).digest('hex');
        }
      } finally {
        await fd.close();
      }
    } catch {
      return null;
    }
  }

  /**
   * Computes full cryptographic SHA-256 hash.
   * Only called on candidates that match both exact size and partial hash.
   */
  public async computeFullHash(filePath: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Starts a background indexing job.
   */
  public async startScan(params: {
    diskId: string;
    targetPath: string;
    isIncremental?: boolean;
    computeHashesImmediately?: boolean;
  }): Promise<string> {
    const disk = dbInstance.getDiskById(params.diskId);
    if (!disk) {
      throw new Error(`Disk ID ${params.diskId} not found in database`);
    }

    const rootPath = path.resolve(params.targetPath);
    if (!fs.existsSync(rootPath)) {
      throw new Error(`Target path "${rootPath}" does not exist or is disconnected`);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobRecord: ScanJobRecord = {
      id: jobId,
      disk_id: params.diskId,
      target_path: rootPath,
      status: 'running',
      started_at: new Date().toISOString(),
      finished_at: null,
      files_scanned: 0,
      folders_scanned: 0,
      bytes_scanned: 0,
      error_count: 0,
      current_path: rootPath
    };

    dbInstance.createScanJob(jobRecord);

    const jobState = {
      job: jobRecord,
      isPaused: false,
      isCancelled: false,
      pausePromise: null as Promise<void> | null,
      resumeResolver: null as (() => void) | null
    };

    this.activeJobs.set(jobId, jobState);

    // Launch background worker without blocking caller
    setImmediate(async () => {
      try {
        await this.runScanLoop(jobState, params.isIncremental || false, params.computeHashesImmediately || false);
      } catch (err: any) {
        jobState.job.status = 'error';
        jobState.job.finished_at = new Date().toISOString();
        dbInstance.updateScanJob(jobState.job);
        dbInstance.addIncident({
          id: `inc_${Date.now()}`,
          scan_job_id: jobId,
          disk_id: params.diskId,
          file_path: rootPath,
          error_code: 'SCAN_FATAL_ERROR',
          error_message: String(err?.message || err),
          timestamp: new Date().toISOString()
        });
      }
    });

    return jobId;
  }

  private async runScanLoop(
    state: {
      job: ScanJobRecord;
      isPaused: boolean;
      isCancelled: boolean;
      pausePromise: Promise<void> | null;
      resumeResolver: (() => void) | null;
    },
    isIncremental: boolean,
    computeHashesImmediately: boolean
  ): Promise<void> {
    const { job } = state;
    const rootPath = job.target_path;
    const diskId = job.disk_id;

    const folderQueue: { currentDir: string; parentFolderId: string | null; depth: number }[] = [
      { currentDir: rootPath, parentFolderId: null, depth: 0 }
    ];

    let filesBuffer: FileRecord[] = [];
    const BATCH_SIZE = 400;

    const flushFiles = () => {
      if (filesBuffer.length > 0) {
        dbInstance.insertFilesBatch(filesBuffer);
        filesBuffer = [];
      }
    };

    while (folderQueue.length > 0 && !state.isCancelled) {
      // Check pause
      if (state.isPaused && state.pausePromise) {
        job.status = 'paused';
        dbInstance.updateScanJob({ id: job.id, status: 'paused' });
        await state.pausePromise;
        job.status = 'running';
        dbInstance.updateScanJob({ id: job.id, status: 'running' });
      }

      if (state.isCancelled) break;

      const currentItem = folderQueue.shift()!;
      const { currentDir, parentFolderId, depth } = currentItem;
      job.current_path = currentDir;

      let folderStat: fs.Stats;
      try {
        folderStat = await fs.promises.stat(currentDir);
      } catch (err: any) {
        job.error_count++;
        dbInstance.addIncident({
          id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          scan_job_id: job.id,
          disk_id: diskId,
          file_path: currentDir,
          error_code: err.code || 'FOLDER_STAT_FAIL',
          error_message: err.message || 'Cannot read folder stats',
          timestamp: new Date().toISOString()
        });
        continue;
      }

      const relPath = path.relative(rootPath, currentDir) || '/';
      const folderId = `f_${crypto.createHash('md5').update(`${diskId}:${relPath}`).digest('hex')}`;
      const folderName = path.basename(currentDir) || path.basename(rootPath) || 'Root';

      let dirEntries: fs.Dirent[] = [];
      try {
        dirEntries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        job.error_count++;
        dbInstance.addIncident({
          id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          scan_job_id: job.id,
          disk_id: diskId,
          file_path: currentDir,
          error_code: err.code || 'READDIR_FAILED',
          error_message: err.message || 'Permission denied or folder inaccessible',
          timestamp: new Date().toISOString()
        });
        continue;
      }

      job.folders_scanned++;
      let folderFileCount = 0;
      let folderTotalBytes = 0;

      for (const entry of dirEntries) {
        if (state.isCancelled) break;

        const fullEntryPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Avoid scanning system virtual directories or circular symlinks
          if (entry.name === '$RECYCLE.BIN' || entry.name === 'System Volume Information' || entry.name === '.Trash-1000') {
            continue;
          }
          folderQueue.push({
            currentDir: fullEntryPath,
            parentFolderId: folderId,
            depth: depth + 1
          });
        } else if (entry.isFile()) {
          try {
            const fileStat = await fs.promises.stat(fullEntryPath);
            const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
            const fileRelPath = path.relative(rootPath, fullEntryPath);
            const fileId = `file_${crypto.createHash('md5').update(`${diskId}:${fileRelPath}`).digest('hex')}`;

            let partialHash: string | null = null;
            let fullHash: string | null = null;

            if (computeHashesImmediately) {
              partialHash = await this.computePartialHash(fullEntryPath, fileStat.size);
              if (fileStat.size < 50 * 1024 * 1024) { // hash files under 50MB during standard scan
                fullHash = await this.computeFullHash(fullEntryPath);
              }
            }

            filesBuffer.push({
              id: fileId,
              disk_id: diskId,
              folder_id: folderId,
              name: entry.name,
              extension: ext || 'sin_extension',
              relative_path: fileRelPath,
              size_bytes: fileStat.size,
              mtime: fileStat.mtime.toISOString(),
              ctime: fileStat.ctime.toISOString(),
              partial_hash: partialHash,
              full_hash: fullHash,
              is_archived: 0,
              last_verified_at: new Date().toISOString()
            });

            folderFileCount++;
            folderTotalBytes += fileStat.size;

            job.files_scanned++;
            job.bytes_scanned += fileStat.size;

            if (filesBuffer.length >= BATCH_SIZE) {
              flushFiles();
              dbInstance.updateScanJob({
                id: job.id,
                files_scanned: job.files_scanned,
                folders_scanned: job.folders_scanned,
                bytes_scanned: job.bytes_scanned,
                error_count: job.error_count,
                current_path: fullEntryPath
              });
            }
          } catch (fileErr: any) {
            job.error_count++;
            dbInstance.addIncident({
              id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              scan_job_id: job.id,
              disk_id: diskId,
              file_path: fullEntryPath,
              error_code: fileErr.code || 'FILE_READ_ERROR',
              error_message: fileErr.message || 'Error accessing file',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Record folder in catalog
      const folderRecord: FolderRecord = {
        id: folderId,
        disk_id: diskId,
        parent_id: parentFolderId,
        path: currentDir,
        relative_path: relPath,
        name: folderName,
        file_count: folderFileCount,
        total_size_bytes: folderTotalBytes,
        mtime: folderStat.mtime.toISOString(),
        depth
      };
      dbInstance.upsertFolder(folderRecord);
    }

    // Flush remaining files
    flushFiles();

    // Mark completion or cancellation
    job.status = state.isCancelled ? 'cancelled' : 'completed';
    job.finished_at = new Date().toISOString();
    job.current_path = '';
    dbInstance.updateScanJob(job);

    // Update disk's last scanned timestamp
    const disk = dbInstance.getDiskById(diskId);
    if (disk) {
      dbInstance.upsertDisk({
        ...disk,
        last_scanned_at: new Date().toISOString()
      });
    }

    this.activeJobs.delete(job.id);
  }

  public pauseScan(jobId: string): boolean {
    const state = this.activeJobs.get(jobId);
    if (!state || state.isPaused) return false;
    state.isPaused = true;
    state.pausePromise = new Promise((resolve) => {
      state.resumeResolver = resolve;
    });
    return true;
  }

  public resumeScan(jobId: string): boolean {
    const state = this.activeJobs.get(jobId);
    if (!state || !state.isPaused) return false;
    state.isPaused = false;
    if (state.resumeResolver) {
      state.resumeResolver();
      state.resumeResolver = null;
      state.pausePromise = null;
    }
    return true;
  }

  public cancelScan(jobId: string): boolean {
    const state = this.activeJobs.get(jobId);
    if (!state) return false;
    state.isCancelled = true;
    if (state.isPaused && state.resumeResolver) {
      state.resumeResolver();
    }
    return true;
  }

  public getActiveProgress(): ScanProgress[] {
    const results: ScanProgress[] = [];
    const now = Date.now();
    for (const [jobId, state] of this.activeJobs.entries()) {
      const elapsedSeconds = Math.max(1, Math.floor((now - new Date(state.job.started_at).getTime()) / 1000));
      results.push({
        jobId,
        diskId: state.job.disk_id,
        status: state.job.status,
        filesScanned: state.job.files_scanned,
        foldersScanned: state.job.folders_scanned,
        bytesScanned: state.job.bytes_scanned,
        errorCount: state.job.error_count,
        currentPath: state.job.current_path,
        startedAt: state.job.started_at,
        elapsedSeconds,
        speedFilesPerSec: Math.floor(state.job.files_scanned / elapsedSeconds)
      });
    }
    return results;
  }
}

export const scanner = new Scanner();
