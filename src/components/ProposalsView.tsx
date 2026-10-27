import React, { useState } from 'react';
import {
  Lightbulb,
  Shield,
  ArrowRight,
  HardDrive,
  Copy,
  FolderArchive,
  Layers,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatBytes } from '../api';

export const ProposalsView: React.FC = () => {
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const proposals = [
    {
      id: 'prop_photos_japan',
      title: 'Consolidación de Colección: Fotos Japón 2023',
      category: 'Unificación de Álbumes',
      impact: 'Alto',
      reclaimableBytes: 26843545600, // ~25 GB
      sourceDisk: 'Seagate Expansion 2TB (Multimedia)',
      targetDisk: 'WD Elements 4TB (Backups & RAW)',
      summary:
        'Se han detectado copias idénticas de 8 archivos RAW en dos discos distintos. Se propone unificar la colección completa en el disco de archivo a largo plazo (WD Elements) y liberar espacio en la unidad multimedia.',
      steps: [
        '1. Verificar integridad de hash SHA-256 en WD Elements 4TB.',
        '2. Confirmar que ninguna fotografía quede huérfana.',
        '3. Marcar archivos redundantes en Seagate para eliminación segura tras validación.'
      ]
    },
    {
      id: 'prop_isos_linux',
      title: 'Deduplicación Global de ISOs de Sistemas Operativos',
      category: 'Optimización de Espacio',
      impact: 'Medio',
      reclaimableBytes: 12280000000, // ~12.2 GB
      sourceDisk: 'WD Elements 4TB & Seagate 2TB',
      targetDisk: 'Samsung T7 SSD 1TB (Proyectos Activos)',
      summary:
        'El instalador "ubuntu-24.04-desktop-amd64.iso" (6.14 GB) existe idéntico en 3 discos duros externos. Se recomienda conservar la copia activa en el SSD rápido y liberar 12.28 GB en los discos mecánicos.',
      steps: [
        '1. Verificar hash SHA-256 del instalador en SSD Samsung T7.',
        '2. Generar informe de redundancia firmado con fecha y hora.',
        '3. Proponer purga selectiva de las 2 copias secundarias.'
      ]
    },
    {
      id: 'prop_projects_archive',
      title: 'Gestión de Versiones: DiskMind Engine v1 & v2',
      category: 'Archivo Histórico',
      impact: 'Bajo',
      reclaimableBytes: 450000000,
      sourceDisk: 'Samsung T7 SSD',
      targetDisk: 'Toshiba Canvio 1TB (Archivo Documentos)',
      summary:
        'Se detectó que el proyecto en Toshiba corresponde a una versión histórica (v1) reemplazada por la versión actual (v2) en el SSD Samsung T7. Se propone etiquetar v1 como "Archivo Frío" con preservación de fecha de modificación.',
      steps: [
        '1. Crear etiqueta de versión "v1-legacy" en catálogo SQLite.',
        '2. Preservar checksums de archivos de código fuente.',
        '3. Evitar sobreescrituras accidentales entre unidades.'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Propuestas de Reorganización Global
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Planes automáticos de consolidación, deduplicación y archivo inteligente entre múltiples discos.
        </p>
      </div>

      {/* Strict Phase 1 Safety Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/40 flex items-start gap-3.5">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-emerald-200">
            Fase 1: Motor en Modo Simulación y Planificación (Solo Lectura)
          </p>
          <p className="text-slate-400 leading-relaxed">
            Por política estricta de seguridad, DiskMind no ejecuta ninguna acción destructiva (borrado, renombrado o movimiento)
            en los discos reales durante esta primera fase. Puedes inspeccionar las propuestas simuladas generadas por el
            motor de reglas y duplicados. En fases posteriores, cada operación requerirá confirmación explícita, verificación de hash
            previo y posterior, y un registro de operaciones con posibilidad de reversión.
          </p>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {proposals.map((prop) => {
          const isSelected = selectedProposal === prop.id;

          return (
            <div
              key={prop.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {prop.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{prop.category}</span>
                      <span>·</span>
                      <span className="text-cyan-400">Impacto {prop.impact}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">Ahorro potencial</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-amber-400">
                    {formatBytes(prop.reclaimableBytes)}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {prop.summary}
              </p>

              {/* Source -> Target Path */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-400 truncate">
                  <span className="text-slate-500 font-sans">Origen:</span>
                  <span className="text-slate-200 truncate">{prop.sourceDisk}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />
                <div className="flex items-center gap-2 text-slate-400 truncate">
                  <span className="text-slate-500 font-sans">Destino:</span>
                  <span className="text-cyan-300 truncate">{prop.targetDisk}</span>
                </div>
              </div>

              {/* Execution Steps */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Protocolo seguro planificado
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {prop.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar (Disabled with explanation) */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Requiere Fase 2: Motor de operaciones seguras</span>
                </span>

                <button
                  disabled
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/60 font-medium cursor-not-allowed text-xs"
                >
                  Ejecución Bloqueada en Fase 1
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
