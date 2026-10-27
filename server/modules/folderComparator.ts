import { dbInstance, FolderRecord, FileRecord } from '../db/database.ts';

export type FolderRelationType = 
  | 'identical'           // 100% same content hashes
  | 'partial_duplicate'    // 40% - 99% hash overlap
  | 'potential_version'   // Same file names / structure but differing hashes or newer mtime
  | 'complementary';      // Similar naming/schema, distinct non-overlapping content

export interface FolderComparisonResult {
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
  relationType: FolderRelationType;
  similarityScore: number; // 0.0 - 1.0
  commonFilesCount: number;
  uniqueACount: number;
  uniqueBCount: number;
  wastedBytesIfMerged: number;
  explanation: string;
}

export class FolderComparator {
  /**
   * Compares folders across disks in the database to detect identical, partial,
   * versioned, or complementary relationships.
   */
  public analyzeFolderRelations(limit = 60): FolderComparisonResult[] {
    const rawDb = dbInstance.getRawDb();

    // Query folders that have at least 2 files
    const foldersStmt = rawDb.prepare(`
      SELECT f.*, d.custom_label as disk_label, d.is_connected as is_disk_connected
      FROM folders f
      JOIN disks d ON f.disk_id = d.id
      WHERE f.file_count >= 2
      ORDER BY f.file_count DESC
      LIMIT 100
    `);

    const folders: any[] = [];
    while (foldersStmt.step()) {
      folders.push(foldersStmt.getAsObject());
    }
    foldersStmt.free();

    if (folders.length < 2) return [];

    // Pre-fetch files for these folders
    const folderFilesMap = new Map<string, {
      name: string;
      size: number;
      fullHash: string | null;
      ext: string;
      mtime: string;
    }[]>();

    const filesStmt = rawDb.prepare(`
      SELECT folder_id, name, size_bytes, full_hash, extension, mtime
      FROM files
    `);
    while (filesStmt.step()) {
      const row = filesStmt.getAsObject() as any;
      if (!folderFilesMap.has(row.folder_id)) {
        folderFilesMap.set(row.folder_id, []);
      }
      folderFilesMap.get(row.folder_id)!.push({
        name: row.name,
        size: row.size_bytes,
        fullHash: row.full_hash,
        ext: row.extension,
        mtime: row.mtime
      });
    }
    filesStmt.free();

    const results: FolderComparisonResult[] = [];

    for (let i = 0; i < folders.length; i++) {
      for (let j = i + 1; j < folders.length; j++) {
        const folderA = folders[i];
        const folderB = folders[j];

        // Skip comparing folder with itself or direct parent/child
        if (folderA.id === folderB.id) continue;
        if (folderA.disk_id === folderB.disk_id && folderA.path === folderB.path) continue;

        const filesA = folderFilesMap.get(folderA.id) || [];
        const filesB = folderFilesMap.get(folderB.id) || [];

        if (filesA.length === 0 || filesB.length === 0) continue;

        // Hash overlap calculation
        const hashesA = new Set(filesA.map(f => f.fullHash).filter(Boolean));
        const hashesB = new Set(filesB.map(f => f.fullHash).filter(Boolean));

        let commonHashesCount = 0;
        let commonBytes = 0;
        for (const h of hashesA) {
          if (hashesB.has(h)) {
            commonHashesCount++;
            const matchingFile = filesA.find(f => f.fullHash === h);
            if (matchingFile) commonBytes += matchingFile.size;
          }
        }

        // Filename overlap calculation
        const namesA = new Set(filesA.map(f => f.name.toLowerCase()));
        const namesB = new Set(filesB.map(f => f.name.toLowerCase()));
        let commonNamesCount = 0;
        for (const n of namesA) {
          if (namesB.has(n)) commonNamesCount++;
        }

        const totalUniqueNames = new Set([...namesA, ...namesB]).size;
        const nameSimilarity = totalUniqueNames > 0 ? commonNamesCount / totalUniqueNames : 0;

        const totalUniqueHashes = new Set([...hashesA, ...hashesB]).size;
        const hashSimilarity = totalUniqueHashes > 0 ? commonHashesCount / totalUniqueHashes : 0;

        // Clean folder name comparison (e.g. "Proyecto_2024" vs "Proyecto_2024_v2")
        const cleanNameA = folderA.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanNameB = folderB.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isNameRelated = cleanNameA.includes(cleanNameB) || cleanNameB.includes(cleanNameA);

        let relationType: FolderRelationType | null = null;
        let similarityScore = 0;
        let explanation = '';

        if (hashSimilarity === 1.0 && hashesA.size > 0 && filesA.length === filesB.length) {
          relationType = 'identical';
          similarityScore = 1.0;
          explanation = `Carpetas 100% idénticas en contenido. Mismos ${commonHashesCount} archivos y hashes exactos.`;
        } else if (hashSimilarity >= 0.4) {
          relationType = 'partial_duplicate';
          similarityScore = Number(hashSimilarity.toFixed(2));
          explanation = `Carpetas parcialmente duplicadas: comparten ${commonHashesCount} archivos exactos (${Math.round(hashSimilarity * 100)}% de coincidencia).`;
        } else if (isNameRelated && nameSimilarity >= 0.5 && hashSimilarity < 0.4) {
          relationType = 'potential_version';
          similarityScore = Number(nameSimilarity.toFixed(2));
          explanation = `Posible versión actualizada o modificada: comparten ${commonNamesCount} nombres de archivos pero su contenido o fecha difiere.`;
        } else if (isNameRelated && hashSimilarity === 0 && filesA.length >= 3 && filesB.length >= 3) {
          // Check if both folders share similar extensions (e.g. photos or documents)
          const extA = new Set(filesA.map(f => f.ext));
          const extB = new Set(filesB.map(f => f.ext));
          let commonExt = 0;
          for (const e of extA) if (extB.has(e)) commonExt++;
          if (commonExt > 0) {
            relationType = 'complementary';
            similarityScore = 0.55;
            explanation = `Carpetas complementarias: nombres y extensiones semejantes sin archivos duplicados. Probable partición de una misma serie o proyecto.`;
          }
        }

        if (relationType) {
          results.push({
            id: `rel_${folderA.id}_${folderB.id}`,
            folderA: {
              id: folderA.id,
              diskId: folderA.disk_id,
              diskLabel: folderA.disk_label,
              isDiskConnected: folderA.is_disk_connected === 1,
              name: folderA.name,
              relativePath: folderA.relative_path,
              fileCount: folderA.file_count,
              totalSizeBytes: folderA.total_size_bytes
            },
            folderB: {
              id: folderB.id,
              diskId: folderB.disk_id,
              diskLabel: folderB.disk_label,
              isDiskConnected: folderB.is_disk_connected === 1,
              name: folderB.name,
              relativePath: folderB.relative_path,
              fileCount: folderB.file_count,
              totalSizeBytes: folderB.total_size_bytes
            },
            relationType,
            similarityScore,
            commonFilesCount: commonHashesCount || commonNamesCount,
            uniqueACount: filesA.length - (commonHashesCount || commonNamesCount),
            uniqueBCount: filesB.length - (commonHashesCount || commonNamesCount),
            wastedBytesIfMerged: commonBytes,
            explanation
          });
        }

        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    return results;
  }
}

export const folderComparator = new FolderComparator();
