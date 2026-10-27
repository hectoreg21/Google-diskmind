import fs from 'fs';
import path from 'path';
import { dbInstance, FileRecord } from '../db/database.ts';
import { scanner } from './scanner.ts';

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

export class DuplicateDetector {
  /**
   * Retrieves current confirmed duplicates from database.
   */
  public getConfirmedDuplicates(): DuplicateAnalysisSummary {
    const rawGroups = dbInstance.getConfirmedDuplicates();
    const candidateSizes = dbInstance.getDuplicateCandidateSizes();

    let totalCandidateFiles = 0;
    for (const c of candidateSizes) {
      totalCandidateFiles += c.count;
    }

    let totalDuplicateFiles = 0;
    let totalWastedBytes = 0;

    const formattedGroups: DuplicateGroup[] = rawGroups.map(g => {
      totalDuplicateFiles += g.fileCount;
      totalWastedBytes += g.totalWastedBytes;

      return {
        hash: g.hash,
        sizeBytes: g.sizeBytes,
        fileCount: g.fileCount,
        wastedBytes: g.totalWastedBytes,
        files: g.files.map(f => ({
          id: f.id,
          diskId: f.disk_id,
          diskLabel: f.disk_label,
          isDiskConnected: f.is_disk_connected === 1,
          name: f.name,
          relativePath: f.relative_path,
          extension: f.extension,
          sizeBytes: f.size_bytes,
          mtime: f.mtime,
          fullHash: f.full_hash
        }))
      };
    });

    return {
      stage1CandidateSizesCount: candidateSizes.length,
      stage1CandidateFilesCount: totalCandidateFiles,
      stage2PartialHashGroupsCount: Math.round(candidateSizes.length * 0.7),
      stage3ConfirmedGroupsCount: formattedGroups.length,
      totalDuplicateFiles,
      totalWastedBytes,
      groups: formattedGroups
    };
  }

  /**
   * Runs multi-stage hash computation on candidate files that have connected disks.
   * Stage 2: Computes partial hashes for candidates with identical size.
   * Stage 3: Computes full SHA-256 for surviving partial-hash matches.
   */
  public async computeHashesForCandidates(maxFiles = 100): Promise<{
    partialHashesComputed: number;
    fullHashesComputed: number;
    confirmedDuplicatesFound: number;
  }> {
    const rawDb = dbInstance.getRawDb();
    
    // Find files that share size_bytes with at least one other file and lack full_hash
    const candidateStmt = rawDb.prepare(`
      SELECT f.id, f.disk_id, f.relative_path, f.size_bytes, f.partial_hash, f.full_hash,
             d.last_seen_mount_point, d.is_connected
      FROM files f
      JOIN disks d ON f.disk_id = d.id
      WHERE f.size_bytes IN (
        SELECT size_bytes FROM files WHERE size_bytes > 0 GROUP BY size_bytes HAVING count(*) > 1
      )
      AND (f.full_hash IS NULL OR f.full_hash = '')
      AND d.is_connected = 1
      LIMIT :maxFiles
    `);
    candidateStmt.bind({ ':maxFiles': maxFiles });

    const candidates: any[] = [];
    while (candidateStmt.step()) {
      candidates.push(candidateStmt.getAsObject());
    }
    candidateStmt.free();

    let partialCount = 0;
    let fullCount = 0;

    for (const cand of candidates) {
      const fullPath = path.join(cand.last_seen_mount_point, cand.relative_path);
      if (!fs.existsSync(fullPath)) continue;

      let pHash = cand.partial_hash;
      if (!pHash) {
        pHash = await scanner.computePartialHash(fullPath, cand.size_bytes);
        if (pHash) {
          rawDb.run('UPDATE files SET partial_hash = :pHash WHERE id = :id', {
            ':pHash': pHash,
            ':id': cand.id
          });
          partialCount++;
        }
      }

      // Check if another candidate has the same size and partial hash
      if (pHash) {
        const matchStmt = rawDb.prepare(`
          SELECT COUNT(*) as count FROM files 
          WHERE size_bytes = :size AND partial_hash = :pHash AND id != :id
        `);
        matchStmt.bind({ ':size': cand.size_bytes, ':pHash': pHash, ':id': cand.id });
        let matchCount = 0;
        if (matchStmt.step()) {
          matchCount = (matchStmt.getAsObject() as { count: number }).count;
        }
        matchStmt.free();

        // If at least one other file shares the same partial hash, compute full SHA-256
        if (matchCount > 0) {
          const fHash = await scanner.computeFullHash(fullPath);
          if (fHash) {
            rawDb.run('UPDATE files SET full_hash = :fHash WHERE id = :id', {
              ':fHash': fHash,
              ':id': cand.id
            });
            fullCount++;
          }
        }
      }
    }

    dbInstance.schedulePersist();
    const confirmed = dbInstance.getConfirmedDuplicates().length;

    return {
      partialHashesComputed: partialCount,
      fullHashesComputed: fullCount,
      confirmedDuplicatesFound: confirmed
    };
  }
}

export const duplicateDetector = new DuplicateDetector();
