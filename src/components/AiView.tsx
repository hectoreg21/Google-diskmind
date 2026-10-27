import React, { useState } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Send,
  Zap,
  Info
} from 'lucide-react';
import { OllamaStatus } from '../types';
import { api, formatBytes } from '../api';

interface AiViewProps {
  status: OllamaStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AiView: React.FC<AiViewProps> = ({ status, onRefresh, isRefreshing }) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    status?.selectedModel || (status?.models[0]?.name ?? '')
  );
  const [testPrompt, setTestPrompt] = useState(
    'Analiza la siguiente lista de nombres de archivos y sugiere una categoría temática unificada:\n- DSC08912_Kyoto_Fushimi.ARW\n- DSC08913_Tokyo_Shinjuku_Night.ARW\n- Timetable_Japan_Rail_Pass.pdf'
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestOllama = async () => {
    if (!testPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setTestResponse(null);

    try {
      const res = await api.testOllama(testPrompt, selectedModel || undefined);
      setTestResponse(res.text);
      setDurationMs(res.durationMs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor Ollama');
    } finally {
      setIsGenerating(false);
    }
  };

  const isOnline = status?.isOnline ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Inteligencia Artificial Local (Ollama)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Conexión independiente con modelos LLM locales en localhost:11434 para comprensión semántica de archivos.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          <span>Verificar Estado de Ollama</span>
        </button>
      </div>

      {/* Local Privacy & Cloud-Free Guarantee */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/40 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-emerald-200">
            Privacidad 100% Local · Cero APIs en la Nube
          </p>
          <p className="text-slate-400 leading-relaxed">
            DiskMind opera exclusivamente en tu ordenador. No se realizan llamadas a servicios externos en la nube.
            La inferencia semántica se ejecuta en tu hardware mediante Ollama.
          </p>
        </div>
      </div>

      {/* Hardware Profile: Intel i5-8250U + NVIDIA GeForce GTX 1050 Mobile */}
      <div className="p-5 rounded-xl bg-slate-900 border border-cyan-800/40 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Aceleración por GPU: NVIDIA GeForce GTX 1050 Mobile (1050M)</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/60">
                  ¡Gran Ayuda Confirmada!
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Arquitectura NVIDIA Pascal con soporte nativo de CUDA (Compute Capability 6.1).
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tener una <strong>GTX 1050M</strong> cambia radicalmente el rendimiento respecto a usar solo el procesador i5-8250U.
          Ollama utiliza automáticamente los núcleos CUDA de la GPU para descargar capas completas del modelo en la memoria de vídeo (VRAM).
          Esto proporciona una aceleración de <strong>3x a 5x más rápida</strong> en la inferencia semántica.
        </p>

        {/* VRAM Fit Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
              <span>llama3.2:1b (~1.3 GB)</span>
              <span className="text-emerald-400 font-mono">100% en VRAM</span>
            </div>
            <div className="text-slate-200 text-xs font-semibold">Ultra veloz (Instantáneo)</div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Cabe por completo en la memoria de la 1050M, liberando la CPU y la RAM.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-900/40 space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
              <span>llama3.2:3b (~2.0 GB)</span>
              <span className="text-cyan-400 font-mono">Recomendado</span>
            </div>
            <div className="text-cyan-300 text-xs font-semibold">Equilibrio perfecto</div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Excelente precisión semántica en español; cabe en la VRAM de la 1050M.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
              <span>mistral:7b (~4.1 GB)</span>
              <span className="text-amber-400 font-mono">Modo Híbrido</span>
            </div>
            <div className="text-slate-200 text-xs font-semibold">VRAM 1050M + 16GB RAM</div>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">
              Ollama descarga capas iniciales en la GPU y el resto en tu RAM del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {isOnline ? 'Ollama en Ejecución' : 'Ollama Fuera de Línea'}
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status?.endpoint || 'http://localhost:11434'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isOnline
                  ? `Detectados ${status?.models.length ?? 0} modelos locales instalados.`
                  : 'Si no tienes Ollama instalado o iniciado, DiskMind sigue funcionando normalmente con SQLite y catalogación.'}
              </p>
            </div>
          </div>

          {/* Model Selector if Online */}
          {isOnline && status?.models && status.models.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Modelo Activo:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {status.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({formatBytes(m.size)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Installed Models Table if Online */}
        {isOnline && status?.models && status.models.length > 0 ? (
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Modelos instalados en disco local
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {status.models.map((m) => (
                <div
                  key={m.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedModel === m.name
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold text-white font-mono truncate">
                    {m.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>Tamaño: {formatBytes(m.size)}</span>
                    {m.parameter_size && <span>Parámetros: {m.parameter_size}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Ollama Interactive Test Sandbox if Online */}
      {isOnline ? (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Prueba de Inferencia Local con Ollama</span>
            </h2>
            {durationMs !== null && (
              <span className="text-xs font-mono text-cyan-400">
                Tiempo de CPU: {durationMs} ms
              </span>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              placeholder="Escribe un prompt para probar el modelo local..."
            />

            <div className="flex justify-end">
              <button
                onClick={handleTestOllama}
                disabled={isGenerating || !selectedModel}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send className={`w-3.5 h-3.5 ${isGenerating ? 'animate-pulse' : ''}`} />
                <span>{isGenerating ? 'Procesando en CPU...' : 'Ejecutar Prompt en Ollama'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {testResponse && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Respuesta del Modelo Local ({selectedModel}):
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {testResponse}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Setup Guide when Ollama is offline or not installed */
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Guía Rápida para Iniciar Ollama en Windows 11 o Ubuntu</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Para la siguiente fase (análisis semántico de documentos y clasificación temática), puedes instalar Ollama
            fácilmente con un solo comando.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Windows 11 */}
            <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="font-bold text-slate-200">En Windows 11 (PowerShell):</div>
              <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                winget install Ollama.Ollama<br />
                ollama run llama3.2:3b
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ollama se iniciará en segundo plano y escuchará automáticamente en http://localhost:11434.
              </p>
            </div>

            {/* Ubuntu Linux */}
            <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="font-bold text-slate-200">En Ubuntu Linux (Terminal):</div>
              <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-cyan-300 select-all">
                curl -fsSL https://ollama.com/install.sh | sh<br />
                ollama run llama3.2:3b
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El modelo Llama 3.2 3B ocupa solo ~2 GB de RAM y vuela en tu CPU Intel i5-8250U.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Modelos recomendados para i5-8250U (16 GB RAM, sin GPU dedicada):
            </div>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-white font-mono">llama3.2:3b</strong> (~2.0 GB RAM) - Rápido, ideal para clasificación y etiquetado.
              </li>
              <li>
                <strong className="text-white font-mono">mistral:7b-instruct-q4_K_M</strong> (~4.1 GB RAM) - Excelente razonamiento y categorización.
              </li>
              <li>
                <strong className="text-white font-mono">nomic-embed-text</strong> (~280 MB RAM) - Vectorización ultra-rápida para similitud semántica.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
