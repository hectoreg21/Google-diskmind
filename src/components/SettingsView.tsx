import React, { useState } from 'react';
import {
  Settings,
  Database,
  Download,
  RotateCcw,
  AlertTriangle,
  Terminal,
  CheckCircle,
  Copy,
  Shield,
  FileText
} from 'lucide-react';
import { Incident } from '../types';
import { formatBytes, formatDate } from '../api';

interface SettingsViewProps {
  systemStatus: any;
  incidents: Incident[];
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemStatus,
  incidents,
  onResetDemo
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const windowsScript = `# 1. Instalar dependencias
npm install

# 2. Iniciar DiskMind en desarrollo
npm run dev

# La aplicación abrirá automáticamente en:
# http://localhost:3000

# 3. (Opcional) Instalar Ollama en Windows 11:
winget install Ollama.Ollama
ollama run llama3.2:3b`;

  const ubuntuScript = `# 1. Clonar o descomprimir repositorio
cd diskmind

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor local
npm run dev

# 4. Acceder en el navegador:
# http://localhost:3000

# 5. (Opcional) Instalar Ollama en Ubuntu:
curl -fsSL https://ollama.com/install.sh | sh
ollama run llama3.2:3b`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Configuración y Guía de Instalación Local
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Instrucciones paso a paso para ejecutar DiskMind de forma nativa en tu ordenador y gestión de la base de datos SQLite.
        </p>
      </div>

      {/* Hardware & Compatibility Specs */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Perfil de Hardware Detectado: Intel i5-8250U · NVIDIA GTX 1050M · 16 GB RAM</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 font-sans block text-[11px]">Procesador (CPU)</span>
            <span className="text-slate-200 font-semibold">Intel Core i5-8250U (4C/8T)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 font-sans block text-[11px]">Tarjeta Gráfica (GPU)</span>
            <span className="text-emerald-400 font-semibold">NVIDIA GTX 1050 Mobile</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 font-sans block text-[11px]">Memoria del Sistema</span>
            <span className="text-slate-200 font-semibold">16 GB DDR4 (100% holgado)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 font-sans block text-[11px]">Base de Datos</span>
            <span className="text-cyan-400 font-semibold">SQLite WAL (data/diskmind.db)</span>
          </div>
        </div>
      </div>

      {/* Step by Step Guides for Windows 11 & Ubuntu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Windows 11 */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Instrucciones para Windows 11
              </h2>
              <button
                onClick={() => copyToClipboard(windowsScript, 'win')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {copiedSection === 'win' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar comandos</span>
                  </>
                )}
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Instala <strong>Node.js 20+ LTS</strong> (desde nodejs.org).
              </li>
              <li>
                Abre <strong>PowerShell</strong> en la carpeta del proyecto.
              </li>
              <li>
                Ejecuta <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">npm install</code> y después <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">npm run dev</code>.
              </li>
              <li>
                Tus discos USB (letras <code className="text-cyan-300 font-mono">D:\</code>, <code className="text-cyan-300 font-mono">E:\</code>, etc.) serán reconocidos y catalogados con su UUID de volumen.
              </li>
            </ol>

            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed border border-slate-800">
              {windowsScript}
            </pre>
          </div>
        </div>

        {/* Ubuntu Linux */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Instrucciones para Ubuntu Linux
              </h2>
              <button
                onClick={() => copyToClipboard(ubuntuScript, 'ubu')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {copiedSection === 'ubu' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar comandos</span>
                  </>
                )}
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Instala Node.js 20+ (<code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">sudo apt install nodejs npm</code>).
              </li>
              <li>
                Accede al directorio y ejecuta <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">npm install</code>.
              </li>
              <li>
                Inicia con <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">npm run dev</code>.
              </li>
              <li>
                Los discos se detectan automáticamente en <code className="text-cyan-300 font-mono">/media/$USER/*</code> o <code className="text-cyan-300 font-mono">/mnt/*</code> vía <code className="font-mono">lsblk</code>.
              </li>
            </ol>

            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed border border-slate-800">
              {ubuntuScript}
            </pre>
          </div>
        </div>
      </div>

      {/* Database Management Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Gestión de la Base de Datos SQLite</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <div>
            <div className="font-semibold text-white">Archivo local: data/diskmind.db</div>
            <div className="text-slate-400 font-mono text-[11px] mt-0.5">
              Tamaño actual en disco: {formatBytes(systemStatus?.dbSizeBytes ?? 0)} · Persistencia continua
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export-db"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar Copia de Seguridad (.db)</span>
            </a>

            <button
              onClick={() => {
                if (window.confirm('¿Reinicializar el catálogo de prueba con los 5 discos de demostración?')) {
                  onResetDemo();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reiniciar Datos de Prueba</span>
            </button>
          </div>
        </div>
      </div>

      {/* Incidents & Read Errors Log Viewer */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Registro de Incidencias y Errores de Lectura ({incidents.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tolerancia a fallos: archivos con permisos denegados o sectores dañados se registran sin interrumpir el escaneo.
            </p>
          </div>
        </div>

        {incidents.length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-slate-950/60 border border-slate-800 text-slate-500 text-xs">
            No se han registrado incidencias de lectura en el catálogo actual.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Fecha y Hora</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Ruta Afectada</th>
                  <th className="px-3 py-2">Descripción del Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                      {formatDate(inc.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-amber-400 font-semibold whitespace-nowrap">
                      {inc.error_code}
                    </td>
                    <td className="px-3 py-2 text-slate-300 truncate max-w-xs" title={inc.file_path}>
                      {inc.file_path}
                    </td>
                    <td className="px-3 py-2 text-slate-400 font-sans">
                      {inc.error_message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
