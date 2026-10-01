/**
 * Förderplan-Assistent Berlin
 * Copyright (C) 2024-2026 Giuseppe Ragusa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Wllama Manager & Lifecycle Controller (CPU WebAssembly + OPFS/IndexedDB)
 * Runs Qwen 2.5 0.5B Instruct (GGUF) via Wllama CPU WebAssembly.
 * Supports high-fidelity 8-bit quantized weights (bartowski Q8_0, ~506MB)
 * and compact 4-bit weights (Qwen Q4_K_M, ~397MB) with 8-bit quantized KV cache.
 * Stores model weights strictly in OPFS and IndexedDB (zero Cache API usage).
 */
import { Wllama, CacheManager } from '@wllama/wllama';
import {
  createWllamaCacheManager,
  getActiveStorageType,
  ensureStoragePersistence,
  purgeAllWllamaStorage,
} from './wllamaStorage';

export interface ModelOption {
  id: string; // The file name in cache
  name: string;
  shortName: string;
  quantization: string;
  downloadSizeMB: number;
  ramRequiredMB: number;
  contextWindow: number;
  kvCacheQuantization: string;
  estimatedTimeFast: string;
  estimatedTimeSlow: string;
  description: string;
  hfRepo: string;
  hfFile: string;
  url: string;
  isRecommended?: boolean;
}

export const AVAILABLE_MODELS: Record<string, ModelOption> = {
  'qwen2.5-0.5b-q8_0': {
    id: 'Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    name: 'Qwen 2.5 (0.5B Instruct GGUF - Q8_0 bartowski)',
    shortName: 'Qwen2.5-0.5B-Q8_0 (Empfohlen)',
    quantization: 'Q8_0 (8-Bit Präzision)',
    downloadSizeMB: 506,
    ramRequiredMB: 680,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    estimatedTimeFast: 'ca. 35–50 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 2–3 Minuten (mobiles Internet)',
    description:
      'Empfohlene 8-Bit-Quantisierung (bartowski). Bietet maximale Sprachpräzision, hervorragende deutsche Satzstrukturen und verhindert Degeneration/Repetitionen bei 0.5B-Modellen nahezu vollständig bei nur ca. 109 MB Mehrdownload.',
    hfRepo: 'bartowski/Qwen2.5-0.5B-Instruct-GGUF',
    hfFile: 'Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    url: 'https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    isRecommended: true,
  },
  'qwen2.5-0.5b-q4_k_m': {
    id: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    name: 'Qwen 2.5 (0.5B Instruct GGUF - Q4_K_M)',
    shortName: 'Qwen2.5-0.5B-Q4_K_M (Kompakt)',
    quantization: 'Q4_K_M (4-Bit)',
    downloadSizeMB: 397,
    ramRequiredMB: 600,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    estimatedTimeFast: 'ca. 25–45 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 2 Minuten (mobiles Internet)',
    description:
      'Kompaktes 4-Bit-GGUF-Modell für minimale Downloadgröße (~397 MB). Benötigt etwas weniger RAM, neigt bei 0.5B-Parametern ohne Repetition-Penalty jedoch eher zu Wiederholungen.',
    hfRepo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    hfFile: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    isRecommended: false,
  },
};

export const DEFAULT_MODEL_KEY = 'qwen2.5-0.5b-q8_0';

export function getActiveModelConfig(): ModelOption {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('foerderplaner_model_key');
    if (saved && AVAILABLE_MODELS[saved]) {
      return AVAILABLE_MODELS[saved];
    }
  }
  return AVAILABLE_MODELS[DEFAULT_MODEL_KEY];
}

// Default export kept for backwards compatibility
export const CURRENT_MODEL_CONFIG = AVAILABLE_MODELS[DEFAULT_MODEL_KEY];

export interface ModelCacheStatus {
  isSupported: boolean;
  isCached: boolean;
  isLoaded: boolean;
  cachedBytes?: number;
  storageBackend: 'OPFS' | 'IndexedDB' | 'None';
  cacheKeys: string[];
  activeModelName?: string;
}

export interface InitProgressReport {
  progress: number;
  text: string;
  timeElapsed?: number;
}

export type ProgressCallback = (report: InitProgressReport) => void;

class WllamaManager {
  private wllama: Wllama | null = null;
  private cacheManager: CacheManager | null = null;
  private isLoading = false;
  private currentLoadedModelId: string | null = null;

  public getSelectedModelKey(): string {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('foerderplaner_model_key');
      if (saved && AVAILABLE_MODELS[saved]) return saved;
    }
    return DEFAULT_MODEL_KEY;
  }

  public setSelectedModelKey(key: string): void {
    if (AVAILABLE_MODELS[key]) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('foerderplaner_model_key', key);
      }
      // If a different model is in memory, release it cleanly
      if (this.wllama && this.currentLoadedModelId !== AVAILABLE_MODELS[key].id) {
        this.wllama.exit().catch(() => {});
        this.wllama = null;
        this.currentLoadedModelId = null;
      }
    }
  }

  public getModelConfig(): ModelOption {
    const key = this.getSelectedModelKey();
    return AVAILABLE_MODELS[key] || AVAILABLE_MODELS[DEFAULT_MODEL_KEY];
  }

  /**
   * Checks if browser supports WebAssembly execution (available on all modern browsers).
   */
  public async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  }

  /**
   * Alias for backward compatibility with previous WebGPU checks.
   * Returns true because Wllama runs on CPU and does not require WebGPU.
   */
  public async isWebGpuSupported(): Promise<boolean> {
    return this.isSupported();
  }

  /**
   * Returns an initialized CacheManager using OPFS and IndexedDB
   */
  private getCacheManager(): CacheManager {
    if (!this.cacheManager) {
      this.cacheManager = createWllamaCacheManager();
    }
    return this.cacheManager;
  }

  /**
   * Check whether model weights are already in OPFS or IndexedDB (without Cache API)
   */
  public async checkCacheStatus(): Promise<ModelCacheStatus> {
    const isSupported = await this.isSupported();
    const storageBackend = await getActiveStorageType();
    const activeModel = this.getModelConfig();

    if (!isSupported) {
      return {
        isSupported: false,
        isCached: false,
        isLoaded: false,
        storageBackend: 'None',
        cacheKeys: [],
        activeModelName: activeModel.name,
      };
    }

    try {
      const cm = this.getCacheManager();
      const files = await cm.list();
      const modelFiles = files.filter(
        (f) =>
          f.name.toLowerCase().includes('qwen') ||
          f.name.toLowerCase().includes('0.5b') ||
          f.name.toLowerCase().includes('.gguf')
      );

      // Check if active model file is cached with at least 50MB
      const isCached = modelFiles.some(
        (f) => (f.name.toLowerCase().includes(activeModel.id.toLowerCase()) || f.name.toLowerCase().includes(activeModel.hfFile.toLowerCase())) && f.size > 50 * 1024 * 1024
      ) || (modelFiles.some(f => f.size > 200 * 1024 * 1024));

      const cachedBytes = modelFiles.reduce((acc, f) => acc + (f.size || 0), 0);

      return {
        isSupported: true,
        isCached,
        isLoaded: !!this.wllama && this.currentLoadedModelId === activeModel.id,
        cachedBytes: cachedBytes > 0 ? cachedBytes : undefined,
        storageBackend,
        cacheKeys: modelFiles.map((f) => f.name),
        activeModelName: activeModel.name,
      };
    } catch (e) {
      console.warn('Could not inspect OPFS/IndexedDB storage:', e);
      return {
        isSupported: true,
        isCached: false,
        isLoaded: !!this.wllama && this.currentLoadedModelId === activeModel.id,
        storageBackend,
        cacheKeys: [],
        activeModelName: activeModel.name,
      };
    }
  }

  /**
   * Clears cached model weights from OPFS and IndexedDB to free up browser storage space
   */
  public async purgeModelCache(): Promise<boolean> {
    if (this.wllama) {
      try {
        await this.wllama.exit();
      } catch (e) {
        console.warn('Error exiting wllama:', e);
      }
      this.wllama = null;
      this.currentLoadedModelId = null;
    }

    this.cacheManager = null;
    return await purgeAllWllamaStorage();
  }

  /**
   * Initialize or load the GGUF model in the Wllama engine
   */
  public async initModel(onProgress?: ProgressCallback): Promise<Wllama> {
    const modelConfig = this.getModelConfig();

    if (this.wllama && this.currentLoadedModelId === modelConfig.id) {
      try {
        const info = this.wllama.getLoadedContextInfo();
        // If current instance context size is at least the target 4096 tokens, reuse it
        if (info && info.n_ctx >= modelConfig.contextWindow) {
          return this.wllama;
        }
        // If loaded with legacy smaller context (e.g. 1024), unload and reinitialize
        await this.wllama.exit();
        this.wllama = null;
      } catch {
        // proceed to reload
      }
    }

    if (this.isLoading) {
      throw new Error('Modell wird bereits geladen. Bitte kurz warten.');
    }

    this.isLoading = true;

    try {
      // Request persistent storage protection for OPFS / IndexedDB
      await ensureStoragePersistence();

      const cm = this.getCacheManager();

      // Configure Wllama with local wasm asset and OPFS/IDB cache manager
      this.wllama = new Wllama(
        {
          default: '/wllama.wasm',
          'single-thread/wllama.wasm': '/wllama.wasm',
          'multi-thread/wllama.wasm': '/wllama.wasm',
        },
        {
          suppressNativeLog: true,
          allowOffline: true,
          cacheManager: cm,
        }
      );

      const startTime = Date.now();

      // Determine available CPU threads safely
      const threadCount = Math.min(
        4,
        Math.max(1, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2)
      );

      // Load model from Hugging Face or cached OPFS/IDB storage with explicit 4096 context & 8-bit quantized KV cache
      await this.wllama.loadModelFromHF(
        {
          repo: modelConfig.hfRepo,
          file: modelConfig.hfFile,
        },
        {
          useCache: true,
          n_gpu_layers: 0, // Enforce CPU execution and suppress "No available adapters" WebGPU probes
          n_threads: threadCount,
          n_ctx: modelConfig.contextWindow, // 4096 tokens (prevents 1024 token limit error)
          n_parallel: 1, // Single-user in-browser sequence
          cache_type_k: 'q8_0', // Quantize KV cache K to 8-bit for minimal RAM overhead
          cache_type_v: 'q8_0', // Quantize KV cache V to 8-bit for minimal RAM overhead
          progressCallback: ({ loaded, total }) => {
            const progress = total > 0 ? loaded / total : 0;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const loadedMB = Math.round(loaded / (1024 * 1024));
            const totalMB = Math.round(total / (1024 * 1024));

            if (onProgress) {
              onProgress({
                progress,
                text: total > 0
                  ? `Lade ${modelConfig.quantization}-Modell in OPFS/IndexedDB (${loadedMB} MB von ${totalMB} MB)...`
                  : `Lade Daten (${loadedMB} MB)...`,
                timeElapsed: elapsed,
              });
            }
          },
        }
      );

      this.currentLoadedModelId = modelConfig.id;
      this.isLoading = false;

      if (onProgress) {
        onProgress({
          progress: 1,
          text: `Modell (${modelConfig.quantization}) erfolgreich geladen und initialisiert!`,
          timeElapsed: Math.round((Date.now() - startTime) / 1000),
        });
      }

      return this.wllama;
    } catch (err: any) {
      this.isLoading = false;
      this.currentLoadedModelId = null;
      if (this.wllama) {
        try {
          await this.wllama.exit();
        } catch {
          // ignore
        }
        this.wllama = null;
      }
      throw err;
    }
  }

  /**
   * Stream a completion using Wllama CPU inference with anti-repetition guards
   */
  public async generateStreaming(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, fullText: string) => void
  ): Promise<string> {
    if (!this.wllama) {
      throw new Error('Modell ist noch nicht geladen. Bitte Modell zuerst initialisieren.');
    }

    let fullText = '';

    const stream = await this.wllama.createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.6, // Higher entropy prevents deterministic repetition loops
      top_p: 0.9,
      top_k: 40,
      penalty_repeat: 1.18, // Active penalty against repeating identical n-grams
      penalty_last_n: 256, // Context window to look back for repetition
      penalty_freq: 0.3, // Frequency penalty
      penalty_present: 0.3, // Presence penalty
      max_tokens: 450, // Capped to realistic length for fast (15-25s) completion
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onToken(delta, fullText);

        // Repetition guard: detect if model enters a degenerative loop of the same phrase
        if (fullText.length > 80) {
          const tail = fullText.slice(-60);
          const firstHalf = tail.slice(0, 30);
          const secondHalf = tail.slice(30);
          if (firstHalf === secondHalf && firstHalf.trim().length > 10) {
            console.warn('Repetition loop detected, stopping generation gracefully');
            break;
          }
        }
      }
    }

    return fullText;
  }

  public isEngineReady(): boolean {
    const activeModel = this.getModelConfig();
    return !!this.wllama && this.currentLoadedModelId === activeModel.id;
  }
}

export const webLlmManager = new WllamaManager();
export const wllamaManager = webLlmManager;
