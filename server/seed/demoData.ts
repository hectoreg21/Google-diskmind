import { dbInstance, DiskRecord, FolderRecord, FileRecord } from '../db/database.ts';

export async function seedDemoDataIfEmpty(): Promise<void> {
  const existingDisks = dbInstance.getDisks();
  if (existingDisks.length > 0) {
    return; // Already initialized
  }

  console.log('Seeding initial realistic multi-disk demo catalog for web preview...');

  const disks: DiskRecord[] = [
    {
      id: 'disk_demo_wd_4tb',
      volume_uuid: 'WD-ELEM-4TB-8842F09A',
      custom_label: 'WD Elements 4TB - Backups & RAW',
      original_mount_point: '/media/user/WD_Elements_4TB',
      last_seen_mount_point: 'E:\\ (Windows) / /media/user/WD_Elements_4TB',
      total_capacity_bytes: 4000787030016, // 4.0 TB
      free_space_bytes: 780200000000,    // ~780 GB free
      is_connected: 0, // Desconectado (OFFLINE)
      filesystem: 'NTFS',
      created_at: '2026-03-10T10:00:00Z',
      updated_at: '2026-10-18T14:30:00Z',
      last_scanned_at: '2026-10-18T14:30:00Z',
      is_demo: 1
    },
    {
      id: 'disk_demo_seagate_2tb',
      volume_uuid: 'SEAGATE-EXP-2TB-9104A11C',
      custom_label: 'Seagate Expansion 2TB - Multimedia',
      original_mount_point: '/media/user/Seagate_2TB',
      last_seen_mount_point: 'F:\\ (Windows) / /media/user/Seagate_2TB',
      total_capacity_bytes: 2000398934016, // 2.0 TB
      free_space_bytes: 380100000000,    // ~380 GB free
      is_connected: 1, // Conectado (ONLINE)
      filesystem: 'exFAT',
      created_at: '2026-04-12T16:20:00Z',
      updated_at: '2026-10-20T08:00:00Z',
      last_scanned_at: '2026-10-20T08:00:00Z',
      is_demo: 1
    },
    {
      id: 'disk_demo_toshiba_1tb',
      volume_uuid: 'TOSHIBA-CANVIO-1TB-3319B44F',
      custom_label: 'Toshiba Canvio 1TB - Archivo Documentos',
      original_mount_point: '/media/user/Toshiba_1TB',
      last_seen_mount_point: 'G:\\ (Windows) / /media/user/Toshiba_1TB',
      total_capacity_bytes: 1000204886016, // 1.0 TB
      free_space_bytes: 345000000000,    // ~345 GB free
      is_connected: 0, // Desconectado (OFFLINE)
      filesystem: 'NTFS',
      created_at: '2026-01-05T09:15:00Z',
      updated_at: '2026-09-12T18:40:00Z',
      last_scanned_at: '2026-09-12T18:40:00Z',
      is_demo: 1
    },
    {
      id: 'disk_demo_samsung_t7',
      volume_uuid: 'SAMSUNG-T7-SSD-7720FF66',
      custom_label: 'Samsung T7 SSD 1TB - Proyectos Activos',
      original_mount_point: '/media/user/Samsung_T7',
      last_seen_mount_point: 'D:\\ (Windows) / /media/user/Samsung_T7',
      total_capacity_bytes: 1000204886016, // 1.0 TB
      free_space_bytes: 560000000000,    // ~560 GB free
      is_connected: 1, // Conectado (ONLINE)
      filesystem: 'exFAT',
      created_at: '2026-05-20T11:00:00Z',
      updated_at: '2026-10-20T09:10:00Z',
      last_scanned_at: '2026-10-20T09:10:00Z',
      is_demo: 1
    },
    {
      id: 'disk_demo_kingston_64gb',
      volume_uuid: 'KINGSTON-DT-64GB-1102C889',
      custom_label: 'Kingston DataTraveler 64GB - Claves & ISOs',
      original_mount_point: '/media/user/Kingston_64G',
      last_seen_mount_point: 'H:\\ (Windows) / /media/user/Kingston_64G',
      total_capacity_bytes: 64100200000,  // 64 GB
      free_space_bytes: 15400000000,     // 15.4 GB free
      is_connected: 1, // Conectado (ONLINE)
      filesystem: 'FAT32',
      created_at: '2026-08-14T14:00:00Z',
      updated_at: '2026-10-19T20:15:00Z',
      last_scanned_at: '2026-10-19T20:15:00Z',
      is_demo: 1
    }
  ];

  for (const d of disks) {
    dbInstance.upsertDisk(d);
  }

  // --- Seed Folders ---
  const folders: FolderRecord[] = [
    // WD 4TB Folders
    {
      id: 'f_wd_photos_japan',
      disk_id: 'disk_demo_wd_4tb',
      parent_id: null,
      path: '/media/user/WD_Elements_4TB/Fotos_2023_Japon',
      relative_path: 'Fotos_2023_Japon',
      name: 'Fotos_2023_Japon',
      file_count: 8,
      total_size_bytes: 26843545600, // 25 GB
      mtime: '2023-11-20T14:00:00Z',
      depth: 1
    },
    {
      id: 'f_wd_photos_japan_raw',
      disk_id: 'disk_demo_wd_4tb',
      parent_id: 'f_wd_photos_japan',
      path: '/media/user/WD_Elements_4TB/Fotos_2023_Japon/RAW_Sony_A7IV',
      relative_path: 'Fotos_2023_Japon/RAW_Sony_A7IV',
      name: 'RAW_Sony_A7IV',
      file_count: 5,
      total_size_bytes: 20480000000,
      mtime: '2023-11-20T14:10:00Z',
      depth: 2
    },
    {
      id: 'f_wd_backups_system',
      disk_id: 'disk_demo_wd_4tb',
      parent_id: null,
      path: '/media/user/WD_Elements_4TB/Backups_Sistemas',
      relative_path: 'Backups_Sistemas',
      name: 'Backups_Sistemas',
      file_count: 4,
      total_size_bytes: 128849018880, // ~120 GB
      mtime: '2024-02-15T09:00:00Z',
      depth: 1
    },
    {
      id: 'f_wd_movies_4k',
      disk_id: 'disk_demo_wd_4tb',
      parent_id: null,
      path: '/media/user/WD_Elements_4TB/Peliculas_4K_HDR',
      relative_path: 'Peliculas_4K_HDR',
      name: 'Peliculas_4K_HDR',
      file_count: 6,
      total_size_bytes: 98000000000,
      mtime: '2024-06-10T19:30:00Z',
      depth: 1
    },

    // Seagate 2TB Folders
    {
      id: 'f_sea_photos_japan_copy',
      disk_id: 'disk_demo_seagate_2tb',
      parent_id: null,
      path: '/media/user/Seagate_2TB/Copia_Fotos_Japon_2023',
      relative_path: 'Copia_Fotos_Japon_2023',
      name: 'Copia_Fotos_Japon_2023',
      file_count: 8,
      total_size_bytes: 26843545600,
      mtime: '2023-11-22T10:00:00Z',
      depth: 1
    },
    {
      id: 'f_sea_documentaries',
      disk_id: 'disk_demo_seagate_2tb',
      parent_id: null,
      path: '/media/user/Seagate_2TB/Documentales_Naturaleza',
      relative_path: 'Documentales_Naturaleza',
      name: 'Documentales_Naturaleza',
      file_count: 5,
      total_size_bytes: 42000000000,
      mtime: '2024-05-18T12:00:00Z',
      depth: 1
    },
    {
      id: 'f_sea_shared_isos',
      disk_id: 'disk_demo_seagate_2tb',
      parent_id: null,
      path: '/media/user/Seagate_2TB/ISOs_Sistemas_Operativos',
      relative_path: 'ISOs_Sistemas_Operativos',
      name: 'ISOs_Sistemas_Operativos',
      file_count: 4,
      total_size_bytes: 18400000000,
      mtime: '2024-08-01T15:20:00Z',
      depth: 1
    },

    // Toshiba 1TB Folders
    {
      id: 'f_tosh_projects_v1',
      disk_id: 'disk_demo_toshiba_1tb',
      parent_id: null,
      path: '/media/user/Toshiba_1TB/Proyectos_Desarrollo/DiskMind_Engine_v1',
      relative_path: 'Proyectos_Desarrollo/DiskMind_Engine_v1',
      name: 'DiskMind_Engine_v1',
      file_count: 7,
      total_size_bytes: 450000000,
      mtime: '2024-03-01T11:00:00Z',
      depth: 2
    },
    {
      id: 'f_tosh_accounting_2023',
      disk_id: 'disk_demo_toshiba_1tb',
      parent_id: null,
      path: '/media/user/Toshiba_1TB/Finanzas_Contabilidad_2023',
      relative_path: 'Finanzas_Contabilidad_2023',
      name: 'Finanzas_Contabilidad_2023',
      file_count: 6,
      total_size_bytes: 85000000,
      mtime: '2024-01-15T18:00:00Z',
      depth: 1
    },

    // Samsung T7 SSD Folders
    {
      id: 'f_sam_projects_v2',
      disk_id: 'disk_demo_samsung_t7',
      parent_id: null,
      path: '/media/user/Samsung_T7/Proyectos_Desarrollo/DiskMind_Engine_v2',
      relative_path: 'Proyectos_Desarrollo/DiskMind_Engine_v2',
      name: 'DiskMind_Engine_v2',
      file_count: 8,
      total_size_bytes: 620000000,
      mtime: '2024-10-18T16:30:00Z',
      depth: 2
    },
    {
      id: 'f_sam_isos',
      disk_id: 'disk_demo_samsung_t7',
      parent_id: null,
      path: '/media/user/Samsung_T7/Instaladores_ISOs',
      relative_path: 'Instaladores_ISOs',
      name: 'Instaladores_ISOs',
      file_count: 3,
      total_size_bytes: 14200000000,
      mtime: '2024-09-10T12:00:00Z',
      depth: 1
    },

    // Kingston 64GB Folders
    {
      id: 'f_king_rescue',
      disk_id: 'disk_demo_kingston_64gb',
      parent_id: null,
      path: '/media/user/Kingston_64G/Herramientas_Rescate',
      relative_path: 'Herramientas_Rescate',
      name: 'Herramientas_Rescate',
      file_count: 4,
      total_size_bytes: 6800000000,
      mtime: '2024-08-20T17:00:00Z',
      depth: 1
    }
  ];

  for (const f of folders) {
    dbInstance.upsertFolder(f);
  }

  // --- Seed Files with realistic hashes and duplicates across disks ---
  // Hash Constants for confirmed exact duplicates across disks
  const HASH_UBUNTU_24_ISO = '98a23049b71f9cf3832e8b28f110c9e6da80523490715df9121a8123de218841';
  const HASH_RAW_KYOTO_01 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const HASH_RAW_TOKYO_NIGHT = '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4';
  const HASH_BACKUP_SQLITE_2023 = '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a';
  const HASH_DOC_PLAN_NEGOCIO = 'c282649a502f83141f1a54ea77c97f4803d15a5f782352123512398412039841';

  const files: FileRecord[] = [
    // --- WD Elements 4TB Files (OFFLINE DISK - fully cataloged & browsable!) ---
    {
      id: 'file_wd_1',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_photos_japan',
      name: 'DSC08912_Kyoto_Fushimi.ARW',
      extension: 'arw',
      relative_path: 'Fotos_2023_Japon/DSC08912_Kyoto_Fushimi.ARW',
      size_bytes: 48500200, // ~48.5 MB
      mtime: '2023-10-15T08:24:12Z',
      ctime: '2023-10-15T08:24:12Z',
      partial_hash: 'part_hash_kyoto_01',
      full_hash: HASH_RAW_KYOTO_01, // EXACT DUPLICATE OF SEAGATE
      is_archived: 1,
      last_verified_at: '2026-10-18T14:30:00Z'
    },
    {
      id: 'file_wd_2',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_photos_japan',
      name: 'DSC08913_Tokyo_Shinjuku_Night.ARW',
      extension: 'arw',
      relative_path: 'Fotos_2023_Japon/DSC08913_Tokyo_Shinjuku_Night.ARW',
      size_bytes: 52140800, // ~52.1 MB
      mtime: '2023-10-16T21:12:44Z',
      ctime: '2023-10-16T21:12:44Z',
      partial_hash: 'part_hash_tokyo_night',
      full_hash: HASH_RAW_TOKYO_NIGHT, // EXACT DUPLICATE OF SEAGATE
      is_archived: 1,
      last_verified_at: '2026-10-18T14:30:00Z'
    },
    {
      id: 'file_wd_3',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_photos_japan',
      name: 'Timetable_Japan_Rail_Pass.pdf',
      extension: 'pdf',
      relative_path: 'Fotos_2023_Japon/Timetable_Japan_Rail_Pass.pdf',
      size_bytes: 3410000,
      mtime: '2023-10-01T12:00:00Z',
      ctime: '2023-10-01T12:00:00Z',
      partial_hash: 'part_hash_jr_pass',
      full_hash: 'hash_jr_pass_wd',
      is_archived: 0,
      last_verified_at: '2026-10-18T14:30:00Z'
    },
    {
      id: 'file_wd_4',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_backups_system',
      name: 'ubuntu-24.04-desktop-amd64.iso',
      extension: 'iso',
      relative_path: 'Backups_Sistemas/ubuntu-24.04-desktop-amd64.iso',
      size_bytes: 6140000000, // 6.14 GB
      mtime: '2024-05-01T14:00:00Z',
      ctime: '2024-05-01T14:00:00Z',
      partial_hash: 'part_hash_ubuntu_iso',
      full_hash: HASH_UBUNTU_24_ISO, // EXACT DUPLICATE with Seagate & Samsung T7!
      is_archived: 1,
      last_verified_at: '2026-10-18T14:30:00Z'
    },
    {
      id: 'file_wd_5',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_backups_system',
      name: 'database_backup_annual_2023.sqlite.gz',
      extension: 'gz',
      relative_path: 'Backups_Sistemas/database_backup_annual_2023.sqlite.gz',
      size_bytes: 420000000, // 420 MB
      mtime: '2023-12-31T23:59:00Z',
      ctime: '2023-12-31T23:59:00Z',
      partial_hash: 'part_hash_sql_annual',
      full_hash: HASH_BACKUP_SQLITE_2023,
      is_archived: 1,
      last_verified_at: '2026-10-18T14:30:00Z'
    },
    {
      id: 'file_wd_6',
      disk_id: 'disk_demo_wd_4tb',
      folder_id: 'f_wd_movies_4k',
      name: 'Planeta_Tierra_III_Episodio1_4K_HDR.mkv',
      extension: 'mkv',
      relative_path: 'Peliculas_4K_HDR/Planeta_Tierra_III_Episodio1_4K_HDR.mkv',
      size_bytes: 14800000000, // 14.8 GB
      mtime: '2024-02-10T19:00:00Z',
      ctime: '2024-02-10T19:00:00Z',
      partial_hash: 'part_earth_3_ep1',
      full_hash: 'full_hash_earth_3_ep1_unique',
      is_archived: 0,
      last_verified_at: '2026-10-18T14:30:00Z'
    },

    // --- Seagate Expansion 2TB Files (ONLINE DISK) ---
    {
      id: 'file_sea_1',
      disk_id: 'disk_demo_seagate_2tb',
      folder_id: 'f_sea_photos_japan_copy',
      name: 'DSC08912_Kyoto_Fushimi.ARW',
      extension: 'arw',
      relative_path: 'Copia_Fotos_Japon_2023/DSC08912_Kyoto_Fushimi.ARW',
      size_bytes: 48500200,
      mtime: '2023-10-15T08:24:12Z',
      ctime: '2023-10-15T08:24:12Z',
      partial_hash: 'part_hash_kyoto_01',
      full_hash: HASH_RAW_KYOTO_01, // Exact duplicate!
      is_archived: 0,
      last_verified_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'file_sea_2',
      disk_id: 'disk_demo_seagate_2tb',
      folder_id: 'f_sea_photos_japan_copy',
      name: 'DSC08913_Tokyo_Shinjuku_Night.ARW',
      extension: 'arw',
      relative_path: 'Copia_Fotos_Japon_2023/DSC08913_Tokyo_Shinjuku_Night.ARW',
      size_bytes: 52140800,
      mtime: '2023-10-16T21:12:44Z',
      ctime: '2023-10-16T21:12:44Z',
      partial_hash: 'part_hash_tokyo_night',
      full_hash: HASH_RAW_TOKYO_NIGHT, // Exact duplicate!
      is_archived: 0,
      last_verified_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'file_sea_3',
      disk_id: 'disk_demo_seagate_2tb',
      folder_id: 'f_sea_shared_isos',
      name: 'ubuntu-24.04-desktop-amd64.iso',
      extension: 'iso',
      relative_path: 'ISOs_Sistemas_Operativos/ubuntu-24.04-desktop-amd64.iso',
      size_bytes: 6140000000,
      mtime: '2024-05-01T14:00:00Z',
      ctime: '2024-05-01T14:00:00Z',
      partial_hash: 'part_hash_ubuntu_iso',
      full_hash: HASH_UBUNTU_24_ISO, // Exact duplicate!
      is_archived: 0,
      last_verified_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'file_sea_4',
      disk_id: 'disk_demo_seagate_2tb',
      folder_id: 'f_sea_documentaries',
      name: 'Blue_Planet_Ocean_Giants_1080p.mkv',
      extension: 'mkv',
      relative_path: 'Documentales_Naturaleza/Blue_Planet_Ocean_Giants_1080p.mkv',
      size_bytes: 8400000000,
      mtime: '2024-04-12T10:15:00Z',
      ctime: '2024-04-12T10:15:00Z',
      partial_hash: 'part_blue_planet',
      full_hash: 'full_hash_blue_planet_seagate',
      is_archived: 0,
      last_verified_at: '2026-10-20T08:00:00Z'
    },

    // --- Samsung T7 SSD (ONLINE DISK) ---
    {
      id: 'file_sam_1',
      disk_id: 'disk_demo_samsung_t7',
      folder_id: 'f_sam_isos',
      name: 'ubuntu-24.04-desktop-amd64.iso',
      extension: 'iso',
      relative_path: 'Instaladores_ISOs/ubuntu-24.04-desktop-amd64.iso',
      size_bytes: 6140000000,
      mtime: '2024-05-01T14:00:00Z',
      ctime: '2024-05-01T14:00:00Z',
      partial_hash: 'part_hash_ubuntu_iso',
      full_hash: HASH_UBUNTU_24_ISO, // Triple duplicate across 3 disks!
      is_archived: 0,
      last_verified_at: '2026-10-20T09:10:00Z'
    },
    {
      id: 'file_sam_2',
      disk_id: 'disk_demo_samsung_t7',
      folder_id: 'f_sam_projects_v2',
      name: 'package.json',
      extension: 'json',
      relative_path: 'Proyectos_Desarrollo/DiskMind_Engine_v2/package.json',
      size_bytes: 1840,
      mtime: '2024-10-18T16:30:00Z',
      ctime: '2024-10-18T16:30:00Z',
      partial_hash: 'part_pkg_v2',
      full_hash: 'full_pkg_v2_new_hash',
      is_archived: 0,
      last_verified_at: '2026-10-20T09:10:00Z'
    },
    {
      id: 'file_sam_3',
      disk_id: 'disk_demo_samsung_t7',
      folder_id: 'f_sam_projects_v2',
      name: 'server.ts',
      extension: 'ts',
      relative_path: 'Proyectos_Desarrollo/DiskMind_Engine_v2/server.ts',
      size_bytes: 8400,
      mtime: '2024-10-18T16:32:00Z',
      ctime: '2024-10-18T16:32:00Z',
      partial_hash: 'part_srv_v2',
      full_hash: 'full_srv_v2_hash',
      is_archived: 0,
      last_verified_at: '2026-10-20T09:10:00Z'
    },

    // --- Toshiba 1TB Files (OFFLINE DISK) ---
    {
      id: 'file_tosh_1',
      disk_id: 'disk_demo_toshiba_1tb',
      folder_id: 'f_tosh_projects_v1',
      name: 'package.json',
      extension: 'json',
      relative_path: 'Proyectos_Desarrollo/DiskMind_Engine_v1/package.json',
      size_bytes: 1420,
      mtime: '2024-03-01T11:00:00Z',
      ctime: '2024-03-01T11:00:00Z',
      partial_hash: 'part_pkg_v1',
      full_hash: 'full_pkg_v1_old_hash',
      is_archived: 1,
      last_verified_at: '2026-09-12T18:40:00Z'
    },
    {
      id: 'file_tosh_2',
      disk_id: 'disk_demo_toshiba_1tb',
      folder_id: 'f_tosh_accounting_2023',
      name: 'Plan_Estrategico_Consolidado_2024.pdf',
      extension: 'pdf',
      relative_path: 'Finanzas_Contabilidad_2023/Plan_Estrategico_Consolidado_2024.pdf',
      size_bytes: 4210500,
      mtime: '2024-01-10T14:20:00Z',
      ctime: '2024-01-10T14:20:00Z',
      partial_hash: 'part_doc_plan_negocio',
      full_hash: HASH_DOC_PLAN_NEGOCIO,
      is_archived: 1,
      last_verified_at: '2026-09-12T18:40:00Z'
    },
    {
      id: 'file_tosh_3',
      disk_id: 'disk_demo_toshiba_1tb',
      folder_id: 'f_tosh_accounting_2023',
      name: 'database_backup_annual_2023.sqlite.gz',
      extension: 'gz',
      relative_path: 'Finanzas_Contabilidad_2023/database_backup_annual_2023.sqlite.gz',
      size_bytes: 420000000,
      mtime: '2023-12-31T23:59:00Z',
      ctime: '2023-12-31T23:59:00Z',
      partial_hash: 'part_hash_sql_annual',
      full_hash: HASH_BACKUP_SQLITE_2023, // Duplicate with WD Elements 4TB!
      is_archived: 1,
      last_verified_at: '2026-09-12T18:40:00Z'
    },

    // --- Kingston 64GB Files (ONLINE DISK) ---
    {
      id: 'file_king_1',
      disk_id: 'disk_demo_kingston_64gb',
      folder_id: 'f_king_rescue',
      name: 'Plan_Estrategico_Consolidado_2024.pdf',
      extension: 'pdf',
      relative_path: 'Herramientas_Rescate/Plan_Estrategico_Consolidado_2024.pdf',
      size_bytes: 4210500,
      mtime: '2024-01-10T14:20:00Z',
      ctime: '2024-01-10T14:20:00Z',
      partial_hash: 'part_doc_plan_negocio',
      full_hash: HASH_DOC_PLAN_NEGOCIO, // Duplicate with Toshiba!
      is_archived: 0,
      last_verified_at: '2026-10-19T20:15:00Z'
    },
    {
      id: 'file_king_2',
      disk_id: 'disk_demo_kingston_64gb',
      folder_id: 'f_king_rescue',
      name: 'memtest86-usb-bootable.img',
      extension: 'img',
      relative_path: 'Herramientas_Rescate/memtest86-usb-bootable.img',
      size_bytes: 512000000,
      mtime: '2024-07-15T09:00:00Z',
      ctime: '2024-07-15T09:00:00Z',
      partial_hash: 'part_memtest',
      full_hash: 'full_hash_memtest_img',
      is_archived: 0,
      last_verified_at: '2026-10-19T20:15:00Z'
    }
  ];

  dbInstance.insertFilesBatch(files);

  // Seed sample incidents (demonstrating error resilience during real scans)
  dbInstance.addIncident({
    id: 'inc_sample_1',
    scan_job_id: 'job_sample_historical_1',
    disk_id: 'disk_demo_wd_4tb',
    file_path: 'E:\\System Volume Information\\IndexerVolumeGuid',
    error_code: 'EACCES',
    error_message: 'Acceso denegado: carpeta de sistema protegida por Windows',
    timestamp: '2026-10-18T14:22:05Z'
  });

  dbInstance.addIncident({
    id: 'inc_sample_2',
    scan_job_id: 'job_sample_historical_1',
    disk_id: 'disk_demo_wd_4tb',
    file_path: 'E:\\Fotos_2022\\Corrupt_Damaged_Sector_091.CR2',
    error_code: 'EBADF_IO_TIMEOUT',
    error_message: 'Error de E/S en sector físico: archivo omitido de forma segura',
    timestamp: '2026-10-18T14:28:19Z'
  });

  dbInstance.persist();
  console.log('Demo catalog successfully populated.');
}
