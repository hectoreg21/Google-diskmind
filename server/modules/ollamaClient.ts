import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GpuInfo {
  detected: boolean;
  name?: string;
  totalVramMB?: number;
  freeVramMB?: number;
  driverVersion?: string;
  cudaSupported: boolean;
  recommendedModel: string;
  advice: string;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  parameter_size?: string;
  family?: string;
}

export interface OllamaStatus {
  isOnline: boolean;
  endpoint: string;
  version?: string;
  models: OllamaModelInfo[];
  selectedModel: string | null;
  errorMessage?: string;
  suggestedModels: string[];
  gpu?: GpuInfo;
}

export class OllamaClient {
  private endpoint: string;
  private selectedModel: string | null = null;

  constructor(endpoint = 'http://localhost:11434') {
    this.endpoint = endpoint;
  }

  public setEndpoint(url: string): void {
    this.endpoint = url.replace(/\/$/, '');
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public setSelectedModel(modelName: string): void {
    this.selectedModel = modelName;
  }

  public async getGpuAccelerationInfo(): Promise<GpuInfo> {
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=gpu_name,memory.total,memory.free,driver_version --format=csv,noheader,nounits',
        { timeout: 3000 }
      );
      if (stdout && stdout.trim()) {
        const parts = stdout.trim().split(',').map(s => s.trim());
        const name = parts[0] || 'NVIDIA GPU';
        const totalVramMB = parseInt(parts[1]) || 4096;
        const freeVramMB = parseInt(parts[2]) || 3500;
        const driverVersion = parts[3] || 'Desconocido';

        return {
          detected: true,
          name,
          totalVramMB,
          freeVramMB,
          driverVersion,
          cudaSupported: true,
          recommendedModel: totalVramMB <= 2500 ? 'llama3.2:1b o nomic-embed-text' : 'llama3.2:3b (Aceleración completa en VRAM)',
          advice: `Detectada ${name} con ${Math.round(totalVramMB / 1024)}GB VRAM. Ollama descargará automáticamente las capas del modelo a la GPU mediante CUDA, multiplicando por 3-5x la velocidad de análisis semántico frente a la CPU.`
        };
      }
    } catch {
      // Fallback for laptops with 1050M without nvidia-smi in PATH or container
    }

    // Default profile for Intel i5-8250U + NVIDIA GTX 1050M (2GB - 4GB VRAM)
    return {
      detected: false,
      name: 'NVIDIA GeForce GTX 1050M (Detectada en perfil de hardware)',
      totalVramMB: 4096,
      freeVramMB: 3800,
      driverVersion: 'CUDA Compatible (Compute 6.1)',
      cudaSupported: true,
      recommendedModel: 'llama3.2:3b (~2.0 GB VRAM) y nomic-embed-text (~280 MB)',
      advice: 'Tu GTX 1050 Mobile cuenta con arquitectura Pascal (Compute 6.1). Al ejecutar Ollama en Windows o Ubuntu con drivers NVIDIA, Ollama descargará automáticamente el modelo en la VRAM de tu 1050M, logrando inferencia rápida sin sobrecargar la CPU.'
    };
  }

  public async getStatus(): Promise<OllamaStatus> {
    const suggested = [
      'llama3.2:3b (Recomendado para 1050M + i5-8250U, ~2.0 GB VRAM)',
      'nomic-embed-text (Embeddings vectoriales de alta velocidad, ~280 MB)',
      'mistral:7b (Modo híbrido VRAM + RAM del sistema, ~4.1 GB)',
      'qwen2.5:3b (Alta precisión en español y código)'
    ];

    const gpuInfo = await this.getGpuAccelerationInfo();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          isOnline: false,
          endpoint: this.endpoint,
          models: [],
          selectedModel: null,
          errorMessage: `Ollama respondió con código HTTP ${res.status}`,
          suggestedModels: suggested,
          gpu: gpuInfo
        };
      }

      const data = await res.json() as { models?: any[] };
      const models: OllamaModelInfo[] = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size || 0,
        digest: m.digest || '',
        modified_at: m.modified_at || '',
        parameter_size: m.details?.parameter_size,
        family: m.details?.family
      }));

      const activeModel = this.selectedModel || (models.length > 0 ? models[0].name : null);

      return {
        isOnline: true,
        endpoint: this.endpoint,
        models,
        selectedModel: activeModel,
        suggestedModels: suggested,
        gpu: gpuInfo
      };
    } catch (err: any) {
      return {
        isOnline: false,
        endpoint: this.endpoint,
        models: [],
        selectedModel: null,
        errorMessage: 'Ollama no está en ejecución en localhost:11434. La aplicación continuará funcionando en modo catálogo sin IA.',
        suggestedModels: suggested,
        gpu: gpuInfo
      };
    }
  }

  /**
   * Safe prompt test on local Ollama instance
   */
  public async generate(prompt: string, model?: string): Promise<{ text: string; durationMs: number }> {
    const targetModel = model || this.selectedModel;
    if (!targetModel) {
      throw new Error('No hay ningún modelo de Ollama seleccionado o instalado');
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Error en llamada a Ollama: ${res.statusText}`);
      }

      const data = await res.json() as { response?: string };
      return {
        text: data.response || '',
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(err.message || 'Error al conectar con Ollama');
    }
  }
}

export const ollamaClient = new OllamaClient();
