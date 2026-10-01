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
  'qwen2.5-1.5b-q4_k_m': {
    id: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    name: 'Qwen 2.5 (1.5B Instruct GGUF - Q4_K_M bartowski)',
    shortName: 'Qwen2.5-1.5B (Empfohlen)',
    quantization: 'Q4_K_M (4-Bit)',
    downloadSizeMB: 940,
    ramRequiredMB: 1200,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    estimatedTimeFast: 'ca. 50–90 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 3–5 Minuten (mobiles Internet)',
    description:
      'Hervorragendes deutsches Textverständnis mit 1,5 Milliarden Parametern (3-fache Kapazität von 0.5B). Folgt den Abschnitten IST, SOLL und LERNWEG fehlerfrei, verhindert Degenerationen und bietet sprachlich ausgereifte Förderplan-Formulierungen.',
    hfRepo: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF',
    hfFile: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    isRecommended: true,
  },
  'qwen2.5-0.5b-q8_0': {
    id: 'Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    name: 'Qwen 2.5 (0.5B Instruct GGUF - Q8_0 bartowski)',
    shortName: 'Qwen2.5-0.5B-Q8_0 (Kompakt)',
    quantization: 'Q8_0 (8-Bit)',
    downloadSizeMB: 506,
    ramRequiredMB: 680,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    estimatedTimeFast: 'ca. 30–45 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 2–3 Minuten (mobiles Internet)',
    description:
      'Leichtgewichtiges 8-Bit-Modell (~506 MB). Bietet gute Geschwindigkeit auf sparsamer Hardware, verfügt jedoch aufgrund von nur 0,5 Milliarden Parametern über einen begrenzteren deutschen Wortschatz.',
    hfRepo: 'bartowski/Qwen2.5-0.5B-Instruct-GGUF',
    hfFile: 'Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    url: 'https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q8_0.gguf',
    isRecommended: false,
  },
  'qwen2.5-0.5b-q4_k_m': {
    id: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    name: 'Qwen 2.5 (0.5B Instruct GGUF - Q4_K_M)',
    shortName: 'Qwen2.5-0.5B-Q4_K_M (Minimal)',
    quantization: 'Q4_K_M (4-Bit)',
    downloadSizeMB: 397,
    ramRequiredMB: 600,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    estimatedTimeFast: 'ca. 20–35 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 2 Minuten (mobiles Internet)',
    description:
      'Kleinstmögliche Downloadgröße (~397 MB) mit 4-Bit-Quantisierung für extrem ressourcenbeschränkte Umgebungen.',
    hfRepo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    hfFile: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    isRecommended: false,
  },
};

export const DEFAULT_MODEL_KEY = 'qwen2.5-1.5b-q4_k_m';

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

      const baseUrl = import.meta.env.BASE_URL || './';
      const wasmPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}wllama.wasm`;

      // Configure Wllama with local wasm asset and OPFS/IDB cache manager
      this.wllama = new Wllama(
        {
          default: wasmPath,
          'single-thread/wllama.wasm': wasmPath,
          'multi-thread/wllama.wasm': wasmPath,
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

    const stream = await (this.wllama as any).createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temp: 0.6, // Native llama.cpp sampling temperature
      temperature: 0.6,
      top_p: 0.85,
      top_k: 40,
      penalty_repeat: 1.35, // Strong penalty against repeating identical n-grams
      penalty_last_n: 512, // Look back across the full response context
      penalty_freq: 0.5, // Frequency penalty against repeatedly chosen words
      penalty_present: 0.4, // Presence penalty encouraging vocabulary variety
      max_tokens: 420,
      stop: [
        '<|im_end|>',
        '<|endoftext|>',
        '### Ermutigung',
        '### Bedeutung',
        '### Fazit',
        'Hinweis:',
        'AUFGABE:',
        'Schuelerdaten:',
        'Ausgangslage:',
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onToken(delta, fullText);

        // Completion guard: once REFLEXION section is generated, detect end of required content
        const reflexionIdx = fullText.toUpperCase().indexOf('REFLEXION');
        if (reflexionIdx !== -1) {
          const afterReflexion = fullText.slice(reflexionIdx);
          // If the model finishes the REFLEXION sentence and tries to output meta-commentary
          if (
            afterReflexion.includes('\n\n') ||
            afterReflexion.includes('###') ||
            afterReflexion.toLowerCase().includes('ermutigung') ||
            afterReflexion.toLowerCase().includes('bedeutung') ||
            afterReflexion.toLowerCase().includes('fazit')
          ) {
            console.log('Finished 5 standard sections, stopping stream cleanly.');
            break;
          }
        }

        // Repetition guard 1: detect degenerate loop of identical adjacent text
        if (fullText.length > 80) {
          const tail = fullText.slice(-60);
          const firstHalf = tail.slice(0, 30);
          const secondHalf = tail.slice(30);
          if (firstHalf === secondHalf && firstHalf.trim().length > 10) {
            console.warn('Repetition loop detected, stopping generation gracefully');
            break;
          }
        }

        // Repetition guard 2: detect duplicate sentences across different sections (e.g. copying bullet to IST/SOLL/LERNWEG)
        const lines = fullText
          .split('\n')
          .map((l) => l.trim().toLowerCase())
          .filter((l) => l.length > 25 && !l.startsWith('ist:') && !l.startsWith('soll:') && !l.startsWith('absp'));
        const uniqueLines = new Set(lines);
        if (lines.length - uniqueLines.size >= 1) {
          console.warn('Cross-section duplicate sentence detected, stopping stream to prevent repetition cascade');
          break;
        }
      }
    }

    // Clean up trailing commentary or truncated incomplete fragments
    let cleaned = fullText.trim();
    if (cleaned.includes('### Ermutigung')) {
      cleaned = cleaned.split('### Ermutigung')[0].trim();
    }
    if (cleaned.includes('### Bedeutung')) {
      cleaned = cleaned.split('### Bedeutung')[0].trim();
    }
    if (cleaned.includes('### Fazit')) {
      cleaned = cleaned.split('### Fazit')[0].trim();
    }

    // Prevent truncated dangling half-sentences at the end (e.g. "...aufgesch")
    const lastPunctuation = Math.max(
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('!'),
      cleaned.lastIndexOf('?')
    );
    if (lastPunctuation !== -1 && cleaned.length - lastPunctuation > 10) {
      const trailing = cleaned.slice(lastPunctuation + 1).trim();
      // If trailing fragment is incomplete and does not look like a closed bullet or label, trim back to terminal punctuation
      if (!trailing.endsWith('.') && trailing.split(' ').length < 8) {
        cleaned = cleaned.slice(0, lastPunctuation + 1).trim();
      }
    }

    return cleaned;
  }

  public isEngineReady(): boolean {
    const activeModel = this.getModelConfig();
    return !!this.wllama && this.currentLoadedModelId === activeModel.id;
  }
}

export const webLlmManager = new WllamaManager();
export const wllamaManager = webLlmManager;
