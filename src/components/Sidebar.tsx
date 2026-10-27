import React from 'react';
import {
  LayoutDashboard,
  HardDrive,
  FolderTree,
  Copy,
  GitCompare,
  Lightbulb,
  Cpu,
  Settings,
  Shield,
  HelpCircle
} from 'lucide-react';
import { GlobalStats } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  stats: GlobalStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, stats }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard },
    {
      id: 'disks',
      label: 'Mis discos',
      icon: HardDrive,
      badge: stats ? `${stats.totalDisks}` : undefined
    },
    { id: 'explorer', label: 'Explorador global', icon: FolderTree },
    {
      id: 'duplicates',
      label: 'Duplicados',
      icon: Copy,
      badge: stats && stats.duplicateGroupsCount > 0 ? `${stats.duplicateGroupsCount}` : undefined
    },
    { id: 'folders', label: 'Carpetas similares', icon: GitCompare },
    { id: 'proposals', label: 'Propuestas de organización', icon: Lightbulb },
    { id: 'ai', label: 'Inteligencia artificial', icon: Cpu },
    { id: 'settings', label: 'Configuración y Guía', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
          Navegación
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Safety & Storage Card */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fase 1: Seguridad Estricta</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Los discos se leen exclusivamente en modo solo lectura. No se modifican archivos.
          </p>
        </div>

        <button
          onClick={() => onSelectView('settings')}
          className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors px-1"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Guía local Windows 11 / Linux</span>
        </button>
      </div>
    </aside>
  );
};
