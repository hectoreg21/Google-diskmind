import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { dbInstance, DiskRecord } from '../db/database.ts';

const execAsync = promisify(exec);

export interface DetectedVolume {
  mountPoint: string;
  volumeUuid: string;
  label: string;
  totalCapacity: number;
  freeSpace: number;
  filesystem: string;
  isRemovable: boolean;
}

export class DiskManager {
  /**
   * Detects storage volumes on the operating system.
   * Supports Windows 11 (PowerShell/wmic) and Linux (lsblk/proc/mounts).
   */
  public async detectSystemDrives(): Promise<DetectedVolume[]> {
    const isWindows = process.platform === 'win32';
    const detected: DetectedVolume[] = [];

    if (isWindows) {
      try {
        const psCommand = `powershell -Command "Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining, UniqueId | ConvertTo-Json"`;
        const { stdout } = await execAsync(psCommand, { timeout: 4000 });
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of list) {
            if (item.DriveLetter && item.Size > 0) {
              const drivePath = `${item.DriveLetter}:\\`;
              const uuid = item.UniqueId
                ? crypto.createHash('md5').update(String(item.UniqueId)).digest('hex')
                : `WIN-DRIVE-${item.DriveLetter}-${item.FileSystemLabel || 'UNLABELED'}`;
              
              detected.push({
                mountPoint: drivePath,
                volumeUuid: uuid,
                label: item.FileSystemLabel || `Unidad ${item.DriveLetter}:`,
                totalCapacity: Number(item.Size) || 0,
                freeSpace: Number(item.SizeRemaining) || 0,
                filesystem: item.FileSystem || 'NTFS',
                isRemovable: item.DriveLetter !== 'C'
              });
            }
          }
        }
      } catch (err) {
        // Fallback for Windows without PowerShell json support
        const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ';
        for (const letter of driveLetters) {
          const p = `${letter}:\\`;
          if (fs.existsSync(p)) {
            detected.push({
              mountPoint: p,
              volumeUuid: `WIN-DRIVE-${letter}`,
              label: `Unidad ${letter}:`,
              totalCapacity: 1024 * 1024 * 1024 * 1000,
              freeSpace: 1024 * 1024 * 1024 * 400,
              filesystem: 'NTFS/exFAT',
              isRemovable: true
            });
          }
        }
      }
    } else {
      // Linux / Unix detection
      try {
        const { stdout } = await execAsync('lsblk -J -b -o NAME,MOUNTPOINT,SIZE,FSTYPE,UUID,LABEL,RM', { timeout: 4000 });
        if (stdout && stdout.trim()) {
          const data = JSON.parse(stdout);
          const traverseDevices = (devices: any[]) => {
            for (const dev of devices) {
              if (dev.mountpoint && fs.existsSync(dev.mountpoint)) {
                const uuid = dev.uuid || `DEV-${dev.name}-${dev.label || 'LINUX'}`;
                detected.push({
                  mountPoint: dev.mountpoint,
                  volumeUuid: uuid,
                  label: dev.label || path.basename(dev.mountpoint) || dev.name,
                  totalCapacity: Number(dev.size) || 0,
                  freeSpace: Math.floor((Number(dev.size) || 0) * 0.4),
                  filesystem: dev.fstype || 'ext4',
                  isRemovable: dev.rm === true || dev.rm === 1 || dev.mountpoint.startsWith('/media') || dev.mountpoint.startsWith('/run/media')
                });
              }
              if (dev.children) {
                traverseDevices(dev.children);
              }
            }
          };
          if (data.blockdevices) {
            traverseDevices(data.blockdevices);
          }
        }
      } catch (err) {
        // Fallback: check typical mount directories
        const mountPrefixes = ['/media', '/run/media', '/mnt'];
        for (const prefix of mountPrefixes) {
          if (fs.existsSync(prefix)) {
            try {
              const entries = fs.readdirSync(prefix);
              for (const e of entries) {
                const fullP = path.join(prefix, e);
                try {
                  const stat = fs.statSync(fullP);
                  if (stat.isDirectory()) {
                    detected.push({
                      mountPoint: fullP,
                      volumeUuid: `MOUNT-${prefix.replace(/\//g, '_')}-${e}`,
                      label: e,
                      totalCapacity: 1024 * 1024 * 1024 * 500,
                      freeSpace: 1024 * 1024 * 1024 * 200,
                      filesystem: 'ext4/exFAT',
                      isRemovable: true
                    });
                  }
                } catch {
                  // Ignore read error on directory
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    return detected;
  }

  /**
   * Refreshes connection state of all registered disks.
   * If a disk's mount point is missing or UUID changed, it is marked as disconnected.
   * Catalog data is NEVER deleted when a disk disconnects!
   */
  public async syncDiskConnectionStatus(): Promise<DiskRecord[]> {
    const registered = dbInstance.getDisks();
    const systemDrives = await this.detectSystemDrives();

    for (const disk of registered) {
      if (disk.is_demo) {
        // Leave demo disk status as user-controlled
        continue;
      }

      // Check if disk matches any detected system drive by UUID or last seen mount point
      const matched = systemDrives.find(d => 
        (d.volumeUuid && d.volumeUuid === disk.volume_uuid) ||
        (d.mountPoint === disk.last_seen_mount_point) ||
        (d.mountPoint === disk.original_mount_point)
      );

      if (matched) {
        dbInstance.updateDiskStatus(disk.id, true, matched.mountPoint);
      } else {
        // Check if directory actually exists on filesystem
        const exists = fs.existsSync(disk.last_seen_mount_point);
        dbInstance.updateDiskStatus(disk.id, exists);
      }
    }

    return dbInstance.getDisks();
  }

  /**
   * Registers a new disk or updates an existing one without losing catalog.
   */
  public registerDisk(params: {
    customLabel: string;
    mountPoint: string;
    volumeUuid?: string;
    totalCapacityBytes?: number;
    freeSpaceBytes?: number;
    filesystem?: string;
  }): DiskRecord {
    const normalizedPath = path.resolve(params.mountPoint);
    const uuid = params.volumeUuid || `VOL-${crypto.createHash('sha256').update(normalizedPath).digest('hex').substring(0, 16)}`;
    
    const existing = dbInstance.getDiskByVolumeUuid(uuid);

    const diskData = {
      id: existing ? existing.id : `disk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      volume_uuid: uuid,
      custom_label: params.customLabel || path.basename(normalizedPath) || 'Disco Externo',
      original_mount_point: existing ? existing.original_mount_point : normalizedPath,
      last_seen_mount_point: normalizedPath,
      total_capacity_bytes: params.totalCapacityBytes || 1024 * 1024 * 1024 * 1000,
      free_space_bytes: params.freeSpaceBytes || 1024 * 1024 * 1024 * 350,
      is_connected: fs.existsSync(normalizedPath) ? 1 : 0,
      filesystem: params.filesystem || 'NTFS',
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_scanned_at: existing ? existing.last_scanned_at : null,
      is_demo: 0
    };

    dbInstance.upsertDisk(diskData);
    return dbInstance.getDiskById(diskData.id)!;
  }
}

export const diskManager = new DiskManager();
