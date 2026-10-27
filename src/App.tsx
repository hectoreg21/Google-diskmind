import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DisksView } from './components/DisksView';
import { ExplorerView } from './components/ExplorerView';
import { DuplicatesView } from './components/DuplicatesView';
import { FoldersView } from './components/FoldersView';
import { ProposalsView } from './components/ProposalsView';
import { AiView } from './components/AiView';
import { SettingsView } from './components/SettingsView';
import { UniversalSearchModal } from './components/UniversalSearchModal';
import {
  Disk,
  GlobalStats,
  DuplicateAnalysisSummary,
  FolderComparison,
  ScanProgress,
  Incident,
  OllamaStatus
} from './types';
import { api } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedDiskId, setSelectedDiskId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Core Data States
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [disks, setDisks] = useState<Disk[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateAnalysisSummary | null>(null);
  const [comparisons, setComparisons] = useState<FolderComparison[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress[]>([]);

  // Action states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComputingHashes, setIsComputingHashes] = useState(false);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K for Universal Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch initial system data
  const loadAllData = useCallback(async () => {
    try {
      const [
        statsData,
        disksData,
        dupData,
        compData,
        incData,
        ollamaData,
        sysData
      ] = await Promise.all([
        api.getStats().catch(() => null),
        api.getDisks().catch(() => []),
        api.getDuplicates().catch(() => null),
        api.getFolderComparisons().catch(() => []),
        api.getIncidents().catch(() => []),
        api.getOllamaStatus().catch(() => null),
        api.getStatus().catch(() => null)
      ]);

      if (statsData) setStats(statsData);
      if (disksData) setDisks(disksData);
      if (dupData) setDuplicates(dupData);
      if (compData) setComparisons(compData);
      if (incData) setIncidents(incData);
      if (ollamaData) setOllamaStatus(ollamaData);
      if (sysData) setSystemStatus(sysData);
    } catch (err) {
      console.error('Error loading DiskMind data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Periodic poll for scan progress
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        const prog = await api.getScanProgress();
        setScanProgress(prog);
        // If a scan was running and finished, refresh global stats
        if (prog.some(p => p.status === 'running' || p.status === 'paused')) {
          const updatedStats = await api.getStats();
          setStats(updatedStats);
        }
      } catch {
        // Silently catch
      }
    }, 1500);

    return () => clearInterval(pollTimer);
  }, []);

  // Handlers
  const handleSyncDisks = async () => {
    setIsSyncing(true);
    try {
      await api.syncDisks();
      await loadAllData();
    } catch (err) {
      console.error('Error syncing disks:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleConnection = async (diskId: string) => {
    try {
      await api.toggleDiskConnection(diskId);
      const updatedDisks = await api.getDisks();
      setDisks(updatedDisks);
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err) {
      console.error('Error toggling connection:', err);
    }
  };

  const handleUpdateDiskLabel = async (diskId: string, customLabel: string) => {
    try {
      await api.updateDisk(diskId, { customLabel });
      const updatedDisks = await api.getDisks();
      setDisks(updatedDisks);
    } catch (err) {
      console.error('Error updating label:', err);
    }
  };

  const handleRegisterDisk = async (data: {
    customLabel: string;
    mountPoint: string;
    totalCapacityBytes?: number;
    freeSpaceBytes?: number;
    filesystem?: string;
  }) => {
    try {
      await api.registerDisk(data);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar disco');
    }
  };

  const handleStartScan = async (diskId: string, isIncremental = true) => {
    try {
      await api.startScan({
        diskId,
        isIncremental,
        computeHashesImmediately: true
      });
      const prog = await api.getScanProgress();
      setScanProgress(prog);
    } catch (err: any) {
      alert(err.message || 'Error al iniciar escaneo');
    }
  };

  const handlePauseScan = async (jobId: string) => {
    await api.pauseScan(jobId);
    const prog = await api.getScanProgress();
    setScanProgress(prog);
  };

  const handleResumeScan = async (jobId: string) => {
    await api.resumeScan(jobId);
    const prog = await api.getScanProgress();
    setScanProgress(prog);
  };

  const handleCancelScan = async (jobId: string) => {
    await api.cancelScan(jobId);
    const prog = await api.getScanProgress();
    setScanProgress(prog);
    await loadAllData();
  };

  const handleComputeHashes = async () => {
    setIsComputingHashes(true);
    try {
      await api.computeHashes(150);
      const updatedDup = await api.getDuplicates();
      setDuplicates(updatedDup);
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err) {
      console.error('Error computing hashes:', err);
    } finally {
      setIsComputingHashes(false);
    }
  };

  const handleRefreshOllama = async () => {
    setIsRefreshingOllama(true);
    try {
      const status = await api.getOllamaStatus();
      setOllamaStatus(status);
    } catch (err) {
      console.error('Error refreshing Ollama:', err);
    } finally {
      setIsRefreshingOllama(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await loadAllData();
    } catch (err) {
      console.error('Error resetting demo:', err);
    }
  };

  const handleExploreDisk = (diskId: string) => {
    setSelectedDiskId(diskId);
    setCurrentView('explorer');
  };

  const handleSelectSearchResult = (diskId: string, filePath: string) => {
    setSelectedDiskId(diskId);
    setCurrentView('explorer');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Bar Contract (3 zones) */}
      <Navbar
        stats={stats}
        ollamaStatus={ollamaStatus}
        onSyncDisks={handleSyncDisks}
        isSyncing={isSyncing}
        onSelectView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar (256px) */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          stats={stats}
        />

        {/* Dynamic View Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <DashboardView
                stats={stats}
                disks={disks}
                scanProgress={scanProgress}
                onSelectView={setCurrentView}
                onSelectDisk={handleExploreDisk}
                onPauseScan={handlePauseScan}
                onResumeScan={handleResumeScan}
                onCancelScan={handleCancelScan}
                onStartScan={handleStartScan}
              />
            )}

            {currentView === 'disks' && (
              <DisksView
                disks={disks}
                onStartScan={handleStartScan}
                onToggleConnection={handleToggleConnection}
                onUpdateLabel={handleUpdateDiskLabel}
                onRegisterDisk={handleRegisterDisk}
                onExploreDisk={handleExploreDisk}
              />
            )}

            {currentView === 'explorer' && (
              <ExplorerView
                disks={disks}
                selectedDiskId={selectedDiskId}
                onSelectDiskId={setSelectedDiskId}
              />
            )}

            {currentView === 'duplicates' && (
              <DuplicatesView
                duplicates={duplicates}
                onComputeHashes={handleComputeHashes}
                isComputing={isComputingHashes}
              />
            )}

            {currentView === 'folders' && (
              <FoldersView comparisons={comparisons} />
            )}

            {currentView === 'proposals' && (
              <ProposalsView />
            )}

            {currentView === 'ai' && (
              <AiView
                status={ollamaStatus}
                onRefresh={handleRefreshOllama}
                isRefreshing={isRefreshingOllama}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                systemStatus={systemStatus}
                incidents={incidents}
                onResetDemo={handleResetDemo}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Universal Search Modal (Ctrl + K) */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}
