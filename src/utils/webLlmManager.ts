/**
 * WebLLM Manager & Lifecycle Controller
 * Manages Qwen2.5-0.5B-Instruct in a background Web Worker via WebGPU.
 */
import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm';

export const CURRENT_MODEL_CONFIG = {
  id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  name: 'Qwen 2.5 (0.5B Instruct - 4-bit Quantisiert)',
  shortName: 'Qwen2.5-0.5B',
  downloadSizeMB: 360,
  vramRequiredMB: 945,
  contextWindow: 4096,
  estimatedTimeFast: 'ca. 20–45 Sekunden (WLAN / Breitband)',
  estimatedTimeSlow: 'ca. 2–4 Minuten (mobiles Internet)',
  description: 'Leichtgewichtiges Modell für lokale Inferenz direkt im Browser über WebGPU. Respektiert 100% Datenschutz (kein Serverkontakt).'
};

export interface ModelCacheStatus {
  isSupported: boolean;
  isCached: boolean;
  isLoaded: boolean;
  cachedBytes?: number;
  cacheKeys: string[];
}

export type ProgressCallback = (report: InitProgressReport) => void;

class WebLlmManager {
  private engine: MLCEngineInterface | null = null;
  private worker: Worker | null = null;
  private isLoading = false;
  private currentLoadedModelId: string | null = null;

  /**
   * Checks if browser supports WebGPU
   */
  public async isWebGpuSupported(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator) return false;
    if (!('gpu' in navigator)) return false;
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  /**
   * Check whether model weights are already in browser CacheStorage
   */
  public async checkCacheStatus(): Promise<ModelCacheStatus> {
    const isSupported = await this.isWebGpuSupported();
    if (typeof window === 'undefined' || !('caches' in window)) {
      return { isSupported, isCached: false, isLoaded: !!this.engine, cacheKeys: [] };
    }

    try {
      const keys = await window.caches.keys();
      // WebLLM cache typically contains "webllm" or model name in cache keys
      const modelKeys = keys.filter(k => 
        k.toLowerCase().includes('webllm') || 
        k.toLowerCase().includes('qwen') || 
        k.toLowerCase().includes('mlc')
      );

      const isCached = modelKeys.length > 0;
      return {
        isSupported,
        isCached,
        isLoaded: !!this.engine,
        cacheKeys: modelKeys
      };
    } catch (e) {
      console.warn('Could not inspect CacheStorage:', e);
      return { isSupported, isCached: false, isLoaded: !!this.engine, cacheKeys: [] };
    }
  }

  /**
   * Clears old/cached model weights to free up browser storage space
   */
  public async purgeModelCache(): Promise<boolean> {
    // Unload current engine first if active
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {
        console.warn('Error unloading engine:', e);
      }
      this.engine = null;
      this.currentLoadedModelId = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (typeof window === 'undefined' || !('caches' in window)) return false;

    try {
      const keys = await window.caches.keys();
      for (const key of keys) {
        if (
          key.toLowerCase().includes('webllm') || 
          key.toLowerCase().includes('qwen') || 
          key.toLowerCase().includes('mlc')
        ) {
          await window.caches.delete(key);
        }
      }
      return true;
    } catch (e) {
      console.error('Failed to purge model cache:', e);
      return false;
    }
  }

  /**
   * Checks if an older model exists in cache and purges it to save space
   */
  public async purgeOutdatedModelCaches(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      const keys = await window.caches.keys();
      for (const key of keys) {
        // If there's an old model cache that isn't the current model
        if (
          (key.toLowerCase().includes('webllm') || key.toLowerCase().includes('mlc')) &&
          !key.includes('Qwen2.5-0.5B')
        ) {
          await window.caches.delete(key);
          console.info('Purged outdated model cache:', key);
        }
      }
    } catch (e) {
      console.warn('Failed to clean outdated caches:', e);
    }
  }

  /**
   * Initialize or load the model in the worker thread
   */
  public async initModel(onProgress?: ProgressCallback): Promise<MLCEngineInterface> {
    if (this.engine && this.currentLoadedModelId === CURRENT_MODEL_CONFIG.id) {
      return this.engine;
    }

    if (this.isLoading) {
      throw new Error('Modell wird bereits geladen. Bitte kurz warten.');
    }

    this.isLoading = true;

    try {
      // Purge any outdated models first to save space
      await this.purgeOutdatedModelCaches();

      // Create Web Worker
      if (!this.worker) {
        this.worker = new Worker(
          new URL('../workers/llm.worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      // Initialize WebWorker engine
      this.engine = await CreateWebWorkerMLCEngine(
        this.worker,
        CURRENT_MODEL_CONFIG.id,
        {
          initProgressCallback: (report) => {
            if (onProgress) {
              onProgress(report);
            }
          }
        }
      );

      this.currentLoadedModelId = CURRENT_MODEL_CONFIG.id;
      this.isLoading = false;
      return this.engine;
    } catch (err: any) {
      this.isLoading = false;
      this.engine = null;
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      throw err;
    }
  }

  /**
   * Stream a completion using the local worker engine
   */
  public async generateStreaming(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, fullText: string) => void
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('Modell ist noch nicht geladen. Bitte Modell zuerst initialisieren.');
    }

    let fullText = '';

    const stream = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.2, // Low temperature for precise guideline-aligned output
      max_tokens: 1024
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onToken(delta, fullText);
      }
    }

    return fullText;
  }

  public isEngineReady(): boolean {
    return !!this.engine;
  }
}

export const webLlmManager = new WebLlmManager();
