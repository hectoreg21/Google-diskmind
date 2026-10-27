import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbInstance } from './server/db/database.ts';
import { diskManager } from './server/modules/diskManager.ts';
import { scanner } from './server/modules/scanner.ts';
import { duplicateDetector } from './server/modules/duplicateDetector.ts';
import { folderComparator } from './server/modules/folderComparator.ts';
import { ollamaClient } from './server/modules/ollamaClient.ts';
import { seedDemoDataIfEmpty } from './server/seed/demoData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database
  await dbInstance.initialize();
  await seedDemoDataIfEmpty();

  // --- API Routes ---

  // System Status
  app.get('/api/status', async (req, res) => {
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      const dbFile = path.join(dataDir, 'diskmind.db');
      let dbSizeBytes = 0;
      if (fs.existsSync(dbFile)) {
        dbSizeBytes = fs.statSync(dbFile).size;
      }

      const ollamaStatus = await ollamaClient.getStatus();

      res.json({
        app: 'DiskMind',
        version: '1.0.0-phase1',
        platform: process.platform,
        nodeVersion: process.version,
        safeReadOnlyMode: true,
        dbSizeBytes,
        ollamaOnline: ollamaStatus.isOnline,
        ollamaModelsCount: ollamaStatus.models.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Global Statistics
  app.get('/api/stats', (req, res) => {
    try {
      const stats = dbInstance.getGlobalStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disks Management
  app.get('/api/disks', (req, res) => {
    try {
      const disks = dbInstance.getDisks();
      res.json(disks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/disks/sync', async (req, res) => {
    try {
      const updated = await diskManager.syncDiskConnectionStatus();
      res.json({ success: true, disks: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/disks/detect-system', async (req, res) => {
    try {
      const drives = await diskManager.detectSystemDrives();
      res.json(drives);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/disks/register', (req, res) => {
    try {
      const { customLabel, mountPoint, totalCapacityBytes, freeSpaceBytes, filesystem } = req.body;
      if (!mountPoint) {
        return res.status(400).json({ error: 'Ruta de montaje (mountPoint) requerida' });
      }
      const disk = diskManager.registerDisk({
        customLabel,
        mountPoint,
        totalCapacityBytes,
        freeSpaceBytes,
        filesystem
      });
      res.json(disk);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/disks/:id', (req, res) => {
    try {
      const { id } = req.params;
      const disk = dbInstance.getDiskById(id);
      if (!disk) return res.status(404).json({ error: 'Disco no encontrado' });

      const updated = {
        ...disk,
        custom_label: req.body.customLabel || disk.custom_label,
        last_seen_mount_point: req.body.mountPoint || disk.last_seen_mount_point,
        updated_at: new Date().toISOString()
      };
      dbInstance.upsertDisk(updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle connection state (e.g. for testing offline navigation or demo)
  app.post('/api/disks/:id/toggle-connection', (req, res) => {
    try {
      const { id } = req.params;
      const disk = dbInstance.getDiskById(id);
      if (!disk) return res.status(404).json({ error: 'Disco no encontrado' });

      const newStatus = disk.is_connected === 1 ? false : true;
      dbInstance.updateDiskStatus(id, newStatus);
      res.json({ id, is_connected: newStatus ? 1 : 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Explorer - Folders and Files
  app.get('/api/explorer/tree', (req, res) => {
    try {
      const diskId = req.query.diskId as string | undefined;
      const folders = dbInstance.getFoldersByDisk(diskId);
      res.json(folders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/explorer/files', (req, res) => {
    try {
      const diskId = req.query.diskId as string | undefined;
      const folderId = req.query.folderId as string | undefined;
      const search = req.query.search as string | undefined;
      const extension = req.query.extension as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = dbInstance.getFiles({
        diskId,
        folderId,
        search,
        extension,
        limit,
        offset
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Scanner Endpoints
  app.post('/api/scan/start', async (req, res) => {
    try {
      const { diskId, targetPath, isIncremental, computeHashesImmediately } = req.body;
      if (!diskId) return res.status(400).json({ error: 'diskId requerido' });

      const disk = dbInstance.getDiskById(diskId);
      if (!disk) return res.status(404).json({ error: 'Disco no encontrado' });

      const scanPath = targetPath || disk.last_seen_mount_point;
      const jobId = await scanner.startScan({
        diskId,
        targetPath: scanPath,
        isIncremental: Boolean(isIncremental),
        computeHashesImmediately: Boolean(computeHashesImmediately)
      });

      res.json({ success: true, jobId, message: 'Escaneo iniciado en segundo plano' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/scan/:jobId/pause', (req, res) => {
    const success = scanner.pauseScan(req.params.jobId);
    res.json({ success });
  });

  app.post('/api/scan/:jobId/resume', (req, res) => {
    const success = scanner.resumeScan(req.params.jobId);
    res.json({ success });
  });

  app.post('/api/scan/:jobId/cancel', (req, res) => {
    const success = scanner.cancelScan(req.params.jobId);
    res.json({ success });
  });

  app.get('/api/scan/progress', (req, res) => {
    const progressList = scanner.getActiveProgress();
    res.json(progressList);
  });

  app.get('/api/scan/incidents', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const incidents = dbInstance.getIncidents(limit);
    res.json(incidents);
  });

  // Duplicate Detection
  app.get('/api/duplicates', (req, res) => {
    try {
      const summary = duplicateDetector.getConfirmedDuplicates();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/duplicates/compute-hashes', async (req, res) => {
    try {
      const maxFiles = parseInt(req.body.maxFiles) || 100;
      const results = await duplicateDetector.computeHashesForCandidates(maxFiles);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Folder Comparisons
  app.get('/api/folders/compare', (req, res) => {
    try {
      const results = folderComparator.analyzeFolderRelations();
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Universal Global Search across all disks with physical location instructions
  app.get('/api/explorer/universal-search', (req, res) => {
    try {
      const q = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 60;
      const results = dbInstance.searchFilesUniversal(q, limit);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disk Integrity Audit (Health Check against physical filesystem)
  app.post('/api/disks/:id/audit', async (req, res) => {
    try {
      const { id } = req.params;
      const report = await dbInstance.auditDiskIntegrity(id);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GPU & Hardware Acceleration info (NVIDIA GTX 1050M)
  app.get('/api/system/gpu', async (req, res) => {
    try {
      const gpuInfo = await ollamaClient.getGpuAccelerationInfo();
      res.json(gpuInfo);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/disks/:id/breakdown', (req, res) => {
    try {
      const { id } = req.params;
      const breakdown = dbInstance.getDiskCategoryBreakdown(id);
      res.json(breakdown);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/disks/:id/export', (req, res) => {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) || 'csv';
      const { disk, files } = dbInstance.getFullDiskCatalog(id);

      if (!disk) {
        return res.status(404).json({ error: 'Disco no encontrado' });
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="catalogo_${disk.custom_label.replace(/[^a-zA-Z0-9_-]/g, '_')}.json"`);
        return res.json({
          disk: {
            id: disk.id,
            label: disk.custom_label,
            uuid: disk.volume_uuid,
            filesystem: disk.filesystem,
            capacityBytes: disk.total_capacity_bytes,
            totalFiles: files.length,
            exportedAt: new Date().toISOString()
          },
          files: files.map(f => ({
            name: f.name,
            folder: f.folder_name,
            relativePath: f.relative_path,
            sizeBytes: f.size_bytes,
            extension: f.extension,
            mtime: f.mtime,
            fullHash: f.full_hash
          }))
        });
      }

      // Default: CSV format
      const csvRows = [
        ['Nombre', 'Carpeta', 'Ruta Relativa', 'Tamaño (Bytes)', 'Extension', 'Modificado', 'SHA-256'].join(';')
      ];
      for (const f of files) {
        csvRows.push([
          `"${f.name.replace(/"/g, '""')}"`,
          `"${f.folder_name.replace(/"/g, '""')}"`,
          `"${f.relative_path.replace(/"/g, '""')}"`,
          f.size_bytes,
          f.extension,
          f.mtime,
          f.full_hash || ''
        ].join(';'));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="catalogo_${disk.custom_label.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv"`);
      return res.send(csvRows.join('\n'));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Local Ollama AI Endpoints
  app.get('/api/ollama/status', async (req, res) => {
    try {
      const status = await ollamaClient.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ollama/summarize-folder', async (req, res) => {
    try {
      const { folderId, model } = req.body;
      if (!folderId) return res.status(400).json({ error: 'folderId requerido' });

      const filesRes = dbInstance.getFiles({ folderId, limit: 30 });
      const folderList = dbInstance.getFoldersByDisk();
      const folder = folderList.find(f => f.id === folderId);

      if (!folder) return res.status(404).json({ error: 'Carpeta no encontrada' });

      const fileListSummary = filesRes.files.map(f => `- ${f.name} (${f.extension}, ${f.size_bytes} bytes)`).join('\n');
      const prompt = `Actúa como DiskMind, un organizador inteligente de archivos.
Analiza la siguiente carpeta indexada y sus archivos de muestra:
Carpeta: "${folder.name}"
Ruta relativa: "${folder.relative_path}"
Total archivos: ${folder.file_count}

Archivos contenidos:
${fileListSummary || '(Sin archivos directos en la raíz)'}

Genera en español:
1. Una descripción concisa de 2 líneas de qué contiene la carpeta.
2. Tres etiquetas clave (Tags) recomendadas.
3. Propuesta de clasificación temática.`;

      const ollamaStatus = await ollamaClient.getStatus();
      if (ollamaStatus.isOnline) {
        const aiResponse = await ollamaClient.generate(prompt, model);
        return res.json({
          isLiveAi: true,
          modelUsed: model || ollamaStatus.selectedModel,
          prompt,
          summary: aiResponse.text,
          durationMs: aiResponse.durationMs
        });
      } else {
        // Return structured template simulation when Ollama is offline
        const sampleExts = [...new Set(filesRes.files.map(f => f.extension.toUpperCase()))].join(', ');
        return res.json({
          isLiveAi: false,
          modelUsed: 'Plantilla Semántica Local (Ollama Offline)',
          prompt,
          summary: `[Modo Offline] Colección clasificada como "${folder.name}". Contiene ${folder.file_count} elementos con extensiones principales [${sampleExts || 'Varios'}].\nEtiquetas sugeridas: #${folder.name.replace(/[^a-zA-Z0-9]/g, '')}, #${sampleExts.split(', ')[0] || 'Archivo'}, #ColecciónLocal\n\nNota: Para inferencia generativa profunda en tu CPU Intel i5-8250U, inicia Ollama en localhost:11434.`,
          durationMs: 15
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ollama/config', (req, res) => {
    try {
      const { endpoint, selectedModel } = req.body;
      if (endpoint) ollamaClient.setEndpoint(endpoint);
      if (selectedModel) ollamaClient.setSelectedModel(selectedModel);
      res.json({ success: true, endpoint: ollamaClient.getEndpoint() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ollama/test', async (req, res) => {
    try {
      const { prompt, model } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });
      const response = await ollamaClient.generate(prompt, model);
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Backup Download
  app.get('/api/export-db', (req, res) => {
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      const dbFile = path.join(dataDir, 'diskmind.db');
      if (!fs.existsSync(dbFile)) {
        return res.status(404).json({ error: 'Base de datos no encontrada' });
      }
      res.download(dbFile, `diskmind_backup_${Date.now()}.db`);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset to Demo Data
  app.post('/api/demo/reset', async (req, res) => {
    try {
      dbInstance.clearAllData();
      await seedDemoDataIfEmpty();
      res.json({ success: true, message: 'Catálogo de demostración reinicializado con éxito' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite / Frontend Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DiskMind server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting DiskMind server:', err);
  process.exit(1);
});
