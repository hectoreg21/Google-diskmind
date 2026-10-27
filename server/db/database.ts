import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface DiskRecord {
  id: string;
  volume_uuid: string;
  custom_label: string;
  original_mount_point: string;
  last_seen_mount_point: string;
  total_capacity_bytes: number;
  free_space_bytes: number;
  is_connected: number; // 1 or 0
  filesystem: string;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
  file_count?: number;
  total_size_bytes?: number;
  is_demo?: number;
}

export interface FolderRecord {
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

export interface FileRecord {
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
}

export interface ScanJobRecord {
  id: string;
  disk_id: string;
  target_path: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  started_at: string;
  finished_at: string | null;
  files_scanned: number;
  folders_scanned: number;
  bytes_scanned: number;
  error_count: number;
  current_path: string;
}

export interface IncidentRecord {
  id: string;
  scan_job_id: string;
  disk_id: string;
  file_path: string;
  error_code: string;
  error_message: string;
  timestamp: string;
}

class DiskMindDB {
  private db: SqlDatabase | null = null;
  private dbPath: string;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'diskmind.db');
  }

  public async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error('Failed to load existing diskmind.db, creating new one:', err);
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.persist();
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS disks (
        id TEXT PRIMARY KEY,
        volume_uuid TEXT UNIQUE,
        custom_label TEXT NOT NULL,
        original_mount_point TEXT NOT NULL,
        last_seen_mount_point TEXT NOT NULL,
        total_capacity_bytes INTEGER NOT NULL,
        free_space_bytes INTEGER NOT NULL,
        is_connected INTEGER NOT NULL DEFAULT 1,
        filesystem TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_scanned_at TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        disk_id TEXT NOT NULL,
        parent_id TEXT,
        path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        name TEXT NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 0,
        total_size_bytes INTEGER NOT NULL DEFAULT 0,
        mtime TEXT NOT NULL,
        depth INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (disk_id) REFERENCES disks (id)
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        disk_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mtime TEXT NOT NULL,
        ctime TEXT NOT NULL,
        partial_hash TEXT,
        full_hash TEXT,
        is_archived INTEGER NOT NULL DEFAULT 0,
        last_verified_at TEXT NOT NULL,
        FOREIGN KEY (disk_id) REFERENCES disks (id),
        FOREIGN KEY (folder_id) REFERENCES folders (id)
      );

      CREATE TABLE IF NOT EXISTS scan_jobs (
        id TEXT PRIMARY KEY,
        disk_id TEXT NOT NULL,
        target_path TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        files_scanned INTEGER NOT NULL DEFAULT 0,
        folders_scanned INTEGER NOT NULL DEFAULT 0,
        bytes_scanned INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        current_path TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (disk_id) REFERENCES disks (id)
      );

      CREATE TABLE IF NOT EXISTS scan_incidents (
        id TEXT PRIMARY KEY,
        scan_job_id TEXT NOT NULL,
        disk_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        error_code TEXT NOT NULL,
        error_message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS folder_comparisons (
        id TEXT PRIMARY KEY,
        folder_a_id TEXT NOT NULL,
        folder_b_id TEXT NOT NULL,
        disk_a_id TEXT NOT NULL,
        disk_b_id TEXT NOT NULL,
        similarity_score REAL NOT NULL,
        relation_type TEXT NOT NULL,
        common_files_count INTEGER NOT NULL,
        unique_a_count INTEGER NOT NULL,
        unique_b_count INTEGER NOT NULL,
        details TEXT,
        computed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_files_disk_id ON files(disk_id);
      CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_files_size ON files(size_bytes);
      CREATE INDEX IF NOT EXISTS idx_files_full_hash ON files(full_hash);
      CREATE INDEX IF NOT EXISTS idx_folders_disk_id ON folders(disk_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
    `);
  }

  public persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('Failed to write SQLite database to disk:', err);
    }
  }

  public schedulePersist(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.persist();
    }, 1500);
  }

  public getRawDb(): SqlDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // --- Disks operations ---
  public getDisks(): DiskRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM files f WHERE f.disk_id = d.id) AS file_count,
        (SELECT COALESCE(SUM(size_bytes), 0) FROM files f WHERE f.disk_id = d.id) AS total_size_bytes
      FROM disks d
      ORDER BY d.is_connected DESC, d.custom_label ASC
    `);
    const disks: DiskRecord[] = [];
    while (stmt.step()) {
      disks.push(stmt.getAsObject() as unknown as DiskRecord);
    }
    stmt.free();
    return disks;
  }

  public getDiskById(id: string): DiskRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM files f WHERE f.disk_id = d.id) AS file_count,
        (SELECT COALESCE(SUM(size_bytes), 0) FROM files f WHERE f.disk_id = d.id) AS total_size_bytes
      FROM disks d
      WHERE d.id = :id
    `);
    stmt.bind({ ':id': id });
    let disk: DiskRecord | null = null;
    if (stmt.step()) {
      disk = stmt.getAsObject() as unknown as DiskRecord;
    }
    stmt.free();
    return disk;
  }

  public getDiskByVolumeUuid(uuid: string): DiskRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM disks WHERE volume_uuid = :uuid');
    stmt.bind({ ':uuid': uuid });
    let disk: DiskRecord | null = null;
    if (stmt.step()) {
      disk = stmt.getAsObject() as unknown as DiskRecord;
    }
    stmt.free();
    return disk;
  }

  public upsertDisk(disk: Omit<DiskRecord, 'file_count' | 'total_size_bytes'>): void {
    if (!this.db) return;
    const existing = this.getDiskByVolumeUuid(disk.volume_uuid);
    if (existing) {
      this.db.run(`
        UPDATE disks SET
          custom_label = :custom_label,
          last_seen_mount_point = :last_seen_mount_point,
          total_capacity_bytes = :total_capacity_bytes,
          free_space_bytes = :free_space_bytes,
          is_connected = :is_connected,
          filesystem = :filesystem,
          updated_at = :updated_at,
          last_scanned_at = COALESCE(:last_scanned_at, last_scanned_at)
        WHERE id = :id
      `, {
        ':id': existing.id,
        ':custom_label': disk.custom_label || existing.custom_label,
        ':last_seen_mount_point': disk.last_seen_mount_point,
        ':total_capacity_bytes': disk.total_capacity_bytes,
        ':free_space_bytes': disk.free_space_bytes,
        ':is_connected': disk.is_connected,
        ':filesystem': disk.filesystem,
        ':updated_at': new Date().toISOString(),
        ':last_scanned_at': disk.last_scanned_at || null
      });
    } else {
      this.db.run(`
        INSERT INTO disks (
          id, volume_uuid, custom_label, original_mount_point, last_seen_mount_point,
          total_capacity_bytes, free_space_bytes, is_connected, filesystem, created_at, updated_at, last_scanned_at, is_demo
        ) VALUES (
          :id, :volume_uuid, :custom_label, :original_mount_point, :last_seen_mount_point,
          :total_capacity_bytes, :free_space_bytes, :is_connected, :filesystem, :created_at, :updated_at, :last_scanned_at, :is_demo
        )
      `, {
        ':id': disk.id,
        ':volume_uuid': disk.volume_uuid,
        ':custom_label': disk.custom_label,
        ':original_mount_point': disk.original_mount_point,
        ':last_seen_mount_point': disk.last_seen_mount_point,
        ':total_capacity_bytes': disk.total_capacity_bytes,
        ':free_space_bytes': disk.free_space_bytes,
        ':is_connected': disk.is_connected,
        ':filesystem': disk.filesystem,
        ':created_at': disk.created_at || new Date().toISOString(),
        ':updated_at': disk.updated_at || new Date().toISOString(),
        ':last_scanned_at': disk.last_scanned_at || null,
        ':is_demo': disk.is_demo ?? 0
      });
    }
    this.schedulePersist();
  }

  public updateDiskStatus(diskId: string, isConnected: boolean, mountPoint?: string): void {
    if (!this.db) return;
    this.db.run(`
      UPDATE disks SET
        is_connected = :is_connected,
        last_seen_mount_point = COALESCE(:mount_point, last_seen_mount_point),
        updated_at = :updated_at
      WHERE id = :id
    `, {
      ':id': diskId,
      ':is_connected': isConnected ? 1 : 0,
      ':mount_point': mountPoint || null,
      ':updated_at': new Date().toISOString()
    });
    this.schedulePersist();
  }

  // --- Folders & Files operations ---
  public upsertFolder(folder: FolderRecord): void {
    if (!this.db) return;
    this.db.run(`
      INSERT OR REPLACE INTO folders (
        id, disk_id, parent_id, path, relative_path, name, file_count, total_size_bytes, mtime, depth
      ) VALUES (
        :id, :disk_id, :parent_id, :path, :relative_path, :name, :file_count, :total_size_bytes, :mtime, :depth
      )
    `, {
      ':id': folder.id,
      ':disk_id': folder.disk_id,
      ':parent_id': folder.parent_id,
      ':path': folder.path,
      ':relative_path': folder.relative_path,
      ':name': folder.name,
      ':file_count': folder.file_count,
      ':total_size_bytes': folder.total_size_bytes,
      ':mtime': folder.mtime,
      ':depth': folder.depth
    });
  }

  public insertFilesBatch(files: FileRecord[]): void {
    if (!this.db || files.length === 0) return;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO files (
          id, disk_id, folder_id, name, extension, relative_path, size_bytes, mtime, ctime, partial_hash, full_hash, is_archived, last_verified_at
        ) VALUES (
          :id, :disk_id, :folder_id, :name, :extension, :relative_path, :size_bytes, :mtime, :ctime, :partial_hash, :full_hash, :is_archived, :last_verified_at
        )
      `);
      for (const f of files) {
        stmt.run({
          ':id': f.id,
          ':disk_id': f.disk_id,
          ':folder_id': f.folder_id,
          ':name': f.name,
          ':extension': f.extension,
          ':relative_path': f.relative_path,
          ':size_bytes': f.size_bytes,
          ':mtime': f.mtime,
          ':ctime': f.ctime,
          ':partial_hash': f.partial_hash,
          ':full_hash': f.full_hash,
          ':is_archived': f.is_archived,
          ':last_verified_at': f.last_verified_at
        });
      }
      stmt.free();
      this.db.run('COMMIT;');
    } catch (e) {
      this.db.run('ROLLBACK;');
      throw e;
    }
    this.schedulePersist();
  }

  public getFoldersByDisk(diskId?: string): FolderRecord[] {
    if (!this.db) return [];
    let query = 'SELECT * FROM folders';
    if (diskId) {
      query += ' WHERE disk_id = :disk_id';
    }
    query += ' ORDER BY depth ASC, name ASC';

    const stmt = this.db.prepare(query);
    if (diskId) {
      stmt.bind({ ':disk_id': diskId });
    }
    const folders: FolderRecord[] = [];
    while (stmt.step()) {
      folders.push(stmt.getAsObject() as unknown as FolderRecord);
    }
    stmt.free();
    return folders;
  }

  public getFiles(params: {
    diskId?: string;
    folderId?: string;
    search?: string;
    extension?: string;
    limit?: number;
    offset?: number;
  }): { files: (FileRecord & { disk_label?: string })[]; total: number } {
    if (!this.db) return { files: [], total: 0 };

    const conditions: string[] = [];
    const bindParams: Record<string, any> = {};

    if (params.diskId) {
      conditions.push('f.disk_id = :diskId');
      bindParams[':diskId'] = params.diskId;
    }
    if (params.folderId) {
      conditions.push('f.folder_id = :folderId');
      bindParams[':folderId'] = params.folderId;
    }
    if (params.search) {
      conditions.push('(f.name LIKE :search OR f.relative_path LIKE :search)');
      bindParams[':search'] = `%${params.search}%`;
    }
    if (params.extension) {
      conditions.push('f.extension = :extension');
      bindParams[':extension'] = params.extension.toLowerCase();
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) as count FROM files f ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    countStmt.bind(bindParams);
    let total = 0;
    if (countStmt.step()) {
      total = (countStmt.getAsObject() as { count: number }).count;
    }
    countStmt.free();

    // Data query
    const limit = params.limit ?? 100;
    const offset = params.offset ?? 0;
    const dataSql = `
      SELECT f.*, d.custom_label as disk_label
      FROM files f
      LEFT JOIN disks d ON f.disk_id = d.id
      ${whereClause}
      ORDER BY f.size_bytes DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const dataStmt = this.db.prepare(dataSql);
    dataStmt.bind(bindParams);
    const files: (FileRecord & { disk_label?: string })[] = [];
    while (dataStmt.step()) {
      files.push(dataStmt.getAsObject() as unknown as FileRecord & { disk_label?: string });
    }
    dataStmt.free();

    return { files, total };
  }

  // --- Category Breakdown & Treemap query ---
  public getDiskCategoryBreakdown(diskId: string): {
    categories: { category: string; file_count: number; total_bytes: number }[];
    topHeavyFolders: { name: string; relative_path: string; total_size_bytes: number; file_count: number }[];
  } {
    if (!this.db) return { categories: [], topHeavyFolders: [] };

    // Group files by type categories
    const catStmt = this.db.prepare(`
      SELECT 
        CASE 
          WHEN extension IN ('jpg', 'jpeg', 'png', 'gif', 'arw', 'cr2', 'cr3', 'nef', 'raw', 'dng', 'webp') THEN 'Imágenes y RAW'
          WHEN extension IN ('mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm') THEN 'Vídeo y Películas'
          WHEN extension IN ('mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a') THEN 'Música y Audio'
          WHEN extension IN ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md') THEN 'Documentos'
          WHEN extension IN ('zip', 'rar', '7z', 'tar', 'gz', 'bz2') THEN 'Archivos Comprimidos'
          WHEN extension IN ('iso', 'img', 'vmdk', 'dmg') THEN 'ISOs e Imágenes de Disco'
          WHEN extension IN ('ts', 'js', 'py', 'json', 'html', 'css', 'cpp', 'c', 'rs', 'go') THEN 'Código y Datos'
          ELSE 'Otros'
        END as category,
        COUNT(*) as file_count,
        COALESCE(SUM(size_bytes), 0) as total_bytes
      FROM files
      WHERE disk_id = :diskId
      GROUP BY category
      ORDER BY total_bytes DESC
    `);
    catStmt.bind({ ':diskId': diskId });

    const categories: { category: string; file_count: number; total_bytes: number }[] = [];
    while (catStmt.step()) {
      categories.push(catStmt.getAsObject() as any);
    }
    catStmt.free();

    // Top heavy folders
    const heavyStmt = this.db.prepare(`
      SELECT name, relative_path, total_size_bytes, file_count
      FROM folders
      WHERE disk_id = :diskId
      ORDER BY total_size_bytes DESC
      LIMIT 10
    `);
    heavyStmt.bind({ ':diskId': diskId });

    const topHeavyFolders: { name: string; relative_path: string; total_size_bytes: number; file_count: number }[] = [];
    while (heavyStmt.step()) {
      topHeavyFolders.push(heavyStmt.getAsObject() as any);
    }
    heavyStmt.free();

    return { categories, topHeavyFolders };
  }

  // --- Export full disk catalog ---
  public getFullDiskCatalog(diskId: string): {
    disk: DiskRecord | null;
    files: (FileRecord & { folder_name: string })[];
  } {
    const disk = this.getDiskById(diskId);
    if (!disk || !this.db) return { disk: null, files: [] };

    const stmt = this.db.prepare(`
      SELECT f.*, fo.name as folder_name
      FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE f.disk_id = :diskId
      ORDER BY f.relative_path ASC
    `);
    stmt.bind({ ':diskId': diskId });

    const files: (FileRecord & { folder_name: string })[] = [];
    while (stmt.step()) {
      files.push(stmt.getAsObject() as any);
    }
    stmt.free();

    return { disk, files };
  }

  // --- Universal Global Search across all disks with physical location instructions ---
  public searchFilesUniversal(query: string, limit = 60): {
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
  }[] {
    if (!this.db || !query.trim()) return [];

    const stmt = this.db.prepare(`
      SELECT 
        f.id, f.name, f.extension, f.size_bytes, f.relative_path, f.mtime, f.full_hash,
        d.id as disk_id, d.custom_label as disk_label, d.last_seen_mount_point as disk_mount_point,
        d.is_connected as is_disk_connected,
        (SELECT COUNT(*) FROM files f2 WHERE f2.size_bytes = f.size_bytes AND f2.id != f.id) as potential_dup_count
      FROM files f
      JOIN disks d ON f.disk_id = d.id
      WHERE f.name LIKE :search OR f.relative_path LIKE :search OR f.extension = :ext
      ORDER BY f.size_bytes DESC
      LIMIT :limit
    `);

    const cleanQuery = query.trim().replace(/^\./, '');
    stmt.bind({
      ':search': `%${query.trim()}%`,
      ':ext': cleanQuery.toLowerCase(),
      ':limit': limit
    });

    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const isOnline = row.is_disk_connected === 1;
      const locationInstruction = isOnline
        ? `Disponible de inmediato en ${row.disk_label} (${row.disk_mount_point})`
        : `Conecta "${row.disk_label}" a un puerto USB para acceder a este archivo`;

      results.push({
        id: row.id,
        name: row.name,
        extension: row.extension,
        size_bytes: row.size_bytes,
        relative_path: row.relative_path,
        mtime: row.mtime,
        full_hash: row.full_hash,
        disk_id: row.disk_id,
        disk_label: row.disk_label,
        disk_mount_point: row.disk_mount_point,
        is_disk_connected: row.is_disk_connected,
        is_duplicate: row.potential_dup_count > 0,
        location_instruction: locationInstruction
      });
    }
    stmt.free();

    return results;
  }

  // --- Audit disk integrity against physical filesystem ---
  public async auditDiskIntegrity(diskId: string): Promise<{
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
  }> {
    const disk = this.getDiskById(diskId);
    if (!disk) throw new Error('Disco no encontrado');

    const files = this.getFiles({ diskId, limit: 300 }).files;
    const isOnline = fs.existsSync(disk.last_seen_mount_point);

    if (!isOnline) {
      return {
        diskId,
        diskLabel: disk.custom_label,
        isConnected: false,
        totalCatalogedFiles: disk.file_count ?? files.length,
        verifiedFilesOnDisk: 0,
        missingFilesCount: 0,
        modifiedFilesCount: 0,
        checkedSampleCount: 0,
        status: 'disk_offline',
        details: 'El disco está desconectado físicamente. El catálogo en SQLite se mantiene intacto y protegido.',
        discrepancies: []
      };
    }

    let verified = 0;
    let missing = 0;
    let modified = 0;
    const discrepancies: { name: string; relative_path: string; issue: string }[] = [];

    for (const f of files) {
      const fullPath = path.join(disk.last_seen_mount_point, f.relative_path);
      try {
        if (!fs.existsSync(fullPath)) {
          missing++;
          discrepancies.push({
            name: f.name,
            relative_path: f.relative_path,
            issue: 'Archivo no encontrado en la ruta física (posible borrado o renombramiento externo)'
          });
        } else {
          const stat = fs.statSync(fullPath);
          if (stat.size !== f.size_bytes) {
            modified++;
            discrepancies.push({
              name: f.name,
              relative_path: f.relative_path,
              issue: `Tamaño modificado externamente: catálogo ${f.size_bytes}B vs disco físico ${stat.size}B`
            });
          } else {
            verified++;
          }
        }
      } catch (err: any) {
        missing++;
        discrepancies.push({
          name: f.name,
          relative_path: f.relative_path,
          issue: `Error de lectura: ${err.message}`
        });
      }
    }

    const hasIssues = missing > 0 || modified > 0;
    return {
      diskId,
      diskLabel: disk.custom_label,
      isConnected: true,
      totalCatalogedFiles: files.length,
      verifiedFilesOnDisk: verified,
      missingFilesCount: missing,
      modifiedFilesCount: modified,
      checkedSampleCount: files.length,
      status: hasIssues ? 'discrepancies_found' : 'healthy',
      details: hasIssues
        ? `Se detectaron ${missing} archivos no encontrados o ${modified} modificados externamente.`
        : `Integridad 100% verificada. Los ${verified} archivos de muestra coinciden exactamente en tamaño y ruta.`,
      discrepancies
    };
  }

  // --- Duplicate Detection Queries ---
  public getDuplicateCandidateSizes(): { size_bytes: number; count: number }[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT size_bytes, COUNT(*) as count
      FROM files
      WHERE size_bytes > 0
      GROUP BY size_bytes
      HAVING count > 1
      ORDER BY size_bytes DESC
      LIMIT 1000
    `);
    const results: { size_bytes: number; count: number }[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as { size_bytes: number; count: number });
    }
    stmt.free();
    return results;
  }

  public getConfirmedDuplicates(): {
    hash: string;
    fileCount: number;
    sizeBytes: number;
    totalWastedBytes: number;
    files: (FileRecord & { disk_label: string; is_disk_connected: number })[];
  }[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT full_hash, COUNT(*) as file_count, size_bytes,
             ((COUNT(*) - 1) * size_bytes) as wasted_bytes
      FROM files
      WHERE full_hash IS NOT NULL AND full_hash != ''
      GROUP BY full_hash
      HAVING file_count > 1
      ORDER BY wasted_bytes DESC
      LIMIT 200
    `);

    const groups: {
      hash: string;
      fileCount: number;
      sizeBytes: number;
      totalWastedBytes: number;
      files: (FileRecord & { disk_label: string; is_disk_connected: number })[];
    }[] = [];

    const fileStmt = this.db.prepare(`
      SELECT f.*, d.custom_label as disk_label, d.is_connected as is_disk_connected
      FROM files f
      JOIN disks d ON f.disk_id = d.id
      WHERE f.full_hash = :hash
      ORDER BY d.is_connected DESC, f.relative_path ASC
    `);

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const hash = row.full_hash;
      fileStmt.bind({ ':hash': hash });
      const files: (FileRecord & { disk_label: string; is_disk_connected: number })[] = [];
      while (fileStmt.step()) {
        files.push(fileStmt.getAsObject() as any);
      }
      fileStmt.reset();

      groups.push({
        hash,
        fileCount: Number(row.file_count),
        sizeBytes: Number(row.size_bytes),
        totalWastedBytes: Number(row.wasted_bytes),
        files
      });
    }
    stmt.free();
    fileStmt.free();

    return groups;
  }

  // --- Incidents & Scan Jobs ---
  public createScanJob(job: ScanJobRecord): void {
    if (!this.db) return;
    this.db.run(`
      INSERT INTO scan_jobs (
        id, disk_id, target_path, status, started_at, finished_at,
        files_scanned, folders_scanned, bytes_scanned, error_count, current_path
      ) VALUES (
        :id, :disk_id, :target_path, :status, :started_at, :finished_at,
        :files_scanned, :folders_scanned, :bytes_scanned, :error_count, :current_path
      )
    `, {
      ':id': job.id,
      ':disk_id': job.disk_id,
      ':target_path': job.target_path,
      ':status': job.status,
      ':started_at': job.started_at,
      ':finished_at': job.finished_at,
      ':files_scanned': job.files_scanned,
      ':folders_scanned': job.folders_scanned,
      ':bytes_scanned': job.bytes_scanned,
      ':error_count': job.error_count,
      ':current_path': job.current_path
    });
    this.schedulePersist();
  }

  public updateScanJob(job: Partial<ScanJobRecord> & { id: string }): void {
    if (!this.db) return;
    const sets: string[] = [];
    const params: Record<string, any> = { ':id': job.id };

    if (job.status !== undefined) { sets.push('status = :status'); params[':status'] = job.status; }
    if (job.finished_at !== undefined) { sets.push('finished_at = :finished_at'); params[':finished_at'] = job.finished_at; }
    if (job.files_scanned !== undefined) { sets.push('files_scanned = :files_scanned'); params[':files_scanned'] = job.files_scanned; }
    if (job.folders_scanned !== undefined) { sets.push('folders_scanned = :folders_scanned'); params[':folders_scanned'] = job.folders_scanned; }
    if (job.bytes_scanned !== undefined) { sets.push('bytes_scanned = :bytes_scanned'); params[':bytes_scanned'] = job.bytes_scanned; }
    if (job.error_count !== undefined) { sets.push('error_count = :error_count'); params[':error_count'] = job.error_count; }
    if (job.current_path !== undefined) { sets.push('current_path = :current_path'); params[':current_path'] = job.current_path; }

    if (sets.length > 0) {
      this.db.run(`UPDATE scan_jobs SET ${sets.join(', ')} WHERE id = :id`, params);
    }
  }

  public addIncident(incident: IncidentRecord): void {
    if (!this.db) return;
    this.db.run(`
      INSERT INTO scan_incidents (
        id, scan_job_id, disk_id, file_path, error_code, error_message, timestamp
      ) VALUES (
        :id, :scan_job_id, :disk_id, :file_path, :error_code, :error_message, :timestamp
      )
    `, {
      ':id': incident.id,
      ':scan_job_id': incident.scan_job_id,
      ':disk_id': incident.disk_id,
      ':file_path': incident.file_path,
      ':error_code': incident.error_code,
      ':error_message': incident.error_message,
      ':timestamp': incident.timestamp
    });
    this.schedulePersist();
  }

  public getIncidents(limit = 100): IncidentRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT * FROM scan_incidents
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    const incidents: IncidentRecord[] = [];
    while (stmt.step()) {
      incidents.push(stmt.getAsObject() as unknown as IncidentRecord);
    }
    stmt.free();
    return incidents;
  }

  // --- Statistics summary ---
  public getGlobalStats(): {
    totalDisks: number;
    connectedDisks: number;
    disconnectedDisks: number;
    totalFiles: number;
    totalFolders: number;
    totalCatalogedBytes: number;
    duplicateGroupsCount: number;
    totalWastedBytes: number;
  } {
    if (!this.db) {
      return {
        totalDisks: 0,
        connectedDisks: 0,
        disconnectedDisks: 0,
        totalFiles: 0,
        totalFolders: 0,
        totalCatalogedBytes: 0,
        duplicateGroupsCount: 0,
        totalWastedBytes: 0
      };
    }

    const disksRes = this.db.exec(`
      SELECT 
        COUNT(*) as total_disks,
        SUM(CASE WHEN is_connected = 1 THEN 1 ELSE 0 END) as connected_disks,
        SUM(CASE WHEN is_connected = 0 THEN 1 ELSE 0 END) as disconnected_disks
      FROM disks
    `);
    const diskStats = disksRes[0]?.values[0] || [0, 0, 0];

    const filesRes = this.db.exec(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(size_bytes), 0) as total_bytes
      FROM files
    `);
    const fileStats = filesRes[0]?.values[0] || [0, 0];

    const foldersRes = this.db.exec('SELECT COUNT(*) FROM folders');
    const totalFolders = (foldersRes[0]?.values[0]?.[0] as number) || 0;

    const dupRes = this.db.exec(`
      SELECT COUNT(*), COALESCE(SUM(wasted), 0) FROM (
        SELECT full_hash, (COUNT(*) - 1) * size_bytes as wasted
        FROM files
        WHERE full_hash IS NOT NULL AND full_hash != ''
        GROUP BY full_hash
        HAVING COUNT(*) > 1
      )
    `);
    const dupStats = dupRes[0]?.values[0] || [0, 0];

    return {
      totalDisks: Number(diskStats[0] || 0),
      connectedDisks: Number(diskStats[1] || 0),
      disconnectedDisks: Number(diskStats[2] || 0),
      totalFiles: Number(fileStats[0] || 0),
      totalFolders,
      totalCatalogedBytes: Number(fileStats[1] || 0),
      duplicateGroupsCount: Number(dupStats[0] || 0),
      totalWastedBytes: Number(dupStats[1] || 0)
    };
  }

  // Clear demo data
  public clearAllData(): void {
    if (!this.db) return;
    this.db.run(`
      DELETE FROM scan_incidents;
      DELETE FROM scan_jobs;
      DELETE FROM files;
      DELETE FROM folders;
      DELETE FROM disks;
      DELETE FROM folder_comparisons;
    `);
    this.persist();
  }
}

export const dbInstance = new DiskMindDB();
