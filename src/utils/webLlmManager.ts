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
 * Runs state-of-the-art instruction models via Wllama CPU WebAssembly:
 * 1. Llama-3.2-3B-Instruct-Q4_K_S (Preferred, highest quality)
 * 2. Qwen2.5-1.5b-Instruct-Q8_0 (Balanced, high precision)
 * 3. Llama-3.2-1B-Instruct-Q8_0 (Compact & fast for mobile/constrained hardware)
 *
 * Hardware Detection & Adaptive Settings:
 * - Detects CPU cores, RAM, and device type to recommend the best model.
 * - Automatically derives optimal Wllama settings:
 *   * Embeddings disabled (embeddings: false)
 *   * Thread count adapted to physical CPU cores
 *   * Dynamic minimum context window calculated per run from actual prompt tokens
 *   * On-demand start: loaded only when required, stopped and unloaded from RAM immediately after completion.
 * - Optimal sampling parameters: temp 0.3, top_p 0.85, top_k 40, repeat_penalty 1.15, repeat_last_n 64.
 */
import { Wllama, CacheManager } from '@wllama/wllama';
import {
  createWllamaCacheManager,
  getActiveStorageType,
  ensureStoragePersistence,
  purgeAllWllamaStorage,
} from './wllamaStorage';
import { detectDeviceHardware, DeviceHardwareProfile } from './hardwareDetection';

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
  parameters: string;
  isRecommended?: boolean;
}

export const AVAILABLE_MODELS: Record<string, ModelOption> = {
  'llama-3.2-3b-q4_k_s': {
    id: 'Llama-3.2-3B-Instruct-Q4_K_S.gguf',
    name: 'Llama 3.2 (3B Instruct GGUF - Q4_K_S bartowski)',
    shortName: 'Llama-3.2-3B',
    quantization: 'Q4_K_S (4-Bit)',
    downloadSizeMB: 1839,
    ramRequiredMB: 2300,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    parameters: '3.21 Mrd. Parameter',
    estimatedTimeFast: 'ca. 45–90 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 3–5 Minuten (mobiles Internet)',
    description:
      'Höchste Textqualität und nuancierte pädagogische Formulierungen mit 3,21 Milliarden Parametern (Meta Llama 3.2). Folgt dem Berliner Richtlinien-Raster exakt und liefert sprachlich ausgereifte Förderplan-Bausteine.',
    hfRepo: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
    hfFile: 'Llama-3.2-3B-Instruct-Q4_K_S.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_S.gguf',
  },
  'qwen2.5-1.5b-q8_0': {
    id: 'Qwen2.5-1.5B-Instruct-Q8_0.gguf',
    name: 'Qwen 2.5 (1.5B Instruct GGUF - Q8_0 bartowski)',
    shortName: 'Qwen2.5-1.5B',
    quantization: 'Q8_0 (8-Bit)',
    downloadSizeMB: 1570,
    ramRequiredMB: 1950,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    parameters: '1.54 Mrd. Parameter',
    estimatedTimeFast: 'ca. 35–70 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 3–4 Minuten (mobiles Internet)',
    description:
      'Hervorragendes deutsches Sprachverständnis bei verlustfreier 8-Bit-Quantisierung (Qwen Team). Bewährte Balance aus hoher Präzision und moderater Systembelastung.',
    hfRepo: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF',
    hfFile: 'Qwen2.5-1.5B-Instruct-Q8_0.gguf',
    url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q8_0.gguf',
  },
  'llama-3.2-1b-q8_0': {
    id: 'Llama-3.2-1B-Instruct-Q8_0.gguf',
    name: 'Llama 3.2 (1B Instruct GGUF - Q8_0 bartowski)',
    shortName: 'Llama-3.2-1B',
    quantization: 'Q8_0 (8-Bit)',
    downloadSizeMB: 1260,
    ramRequiredMB: 1550,
    contextWindow: 4096,
    kvCacheQuantization: 'q8_0 (8-Bit)',
    parameters: '1.23 Mrd. Parameter',
    estimatedTimeFast: 'ca. 25–50 Sekunden (WLAN / Breitband)',
    estimatedTimeSlow: 'ca. 2–3 Minuten (mobiles Internet)',
    description:
      'Kompakt und schnell mit 1,23 Milliarden Parametern und 8-Bit-Gewichten (Meta Llama 3.2). Empfohlen für Laptops mit begrenztem Arbeitsspeicher oder mobile Begleitgeräte.',
    hfRepo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    hfFile: 'Llama-3.2-1B-Instruct-Q8_0.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q8_0.gguf',
  },
};

/**
 * Returns the auto-detected hardware profile
 */
export function getHardwareProfile(): DeviceHardwareProfile {
  return detectDeviceHardware();
}

/**
 * Resolves the active model key respecting previous user selection in localStorage,
 * or defaulting to the hardware-recommended model.
 */
export function getInitialModelKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('foerderplaner_model_key');
    if (saved && AVAILABLE_MODELS[saved]) {
      return saved;
    }
  }
  const hw = detectDeviceHardware();
  return hw.recommendedModelKey in AVAILABLE_MODELS ? hw.recommendedModelKey : 'llama-3.2-3b-q4_k_s';
}

export const DEFAULT_MODEL_KEY = 'llama-3.2-3b-q4_k_s';

export function getActiveModelConfig(): ModelOption {
  const key = getInitialModelKey();
  return AVAILABLE_MODELS[key] || AVAILABLE_MODELS['llama-3.2-3b-q4_k_s'];
}

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

export interface GenerationStats {
  tokenCount: number;
  tokensPerSec: number;
  elapsedSec: number;
}

export type ProgressCallback = (report: InitProgressReport) => void;

/**
 * Dynamically computes the minimum required context window in tokens
 * by evaluating the prompt character count, expected output tokens, and safety margin.
 * Rounds to a multiple of 256 to ensure minimal RAM usage in WebAssembly.
 */
export function calculateRequiredContext(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 420
): number {
  const promptLength = (systemPrompt + userPrompt).length;
  // German text averages 2.5–3 characters per token plus chat template framing tokens
  const estimatedPromptTokens = Math.ceil(promptLength / 2.5) + 64;
  const totalNeeded = estimatedPromptTokens + maxOutputTokens + 128; // 128 safety buffer
  // Round up to nearest multiple of 256 for clean KV cache allocation (minimum 768 tokens, max 4096)
  const dynamicCtx = Math.max(768, Math.ceil(totalNeeded / 256) * 256);
  return Math.min(4096, dynamicCtx);
}

class WllamaManager {
  private wllama: Wllama | null = null;
  private cacheManager: CacheManager | null = null;
  private isLoading = false;
  private currentLoadedModelId: string | null = null;
  private currentLoadedContext: number | null = null;
  private currentAbortController: AbortController | null = null;

  public getSelectedModelKey(): string {
    return getInitialModelKey();
  }

  public setSelectedModelKey(key: string): void {
    if (AVAILABLE_MODELS[key]) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('foerderplaner_model_key', key);
      }
      // If a different model is currently loaded in memory, release it cleanly
      if (this.wllama && this.currentLoadedModelId !== AVAILABLE_MODELS[key].id) {
        this.unloadModel().catch(() => {});
      }
    }
  }

  public getModelConfig(): ModelOption {
    const key = this.getSelectedModelKey();
    const config = AVAILABLE_MODELS[key] || AVAILABLE_MODELS[DEFAULT_MODEL_KEY];
    const hw = detectDeviceHardware();
    return {
      ...config,
      isRecommended: key === hw.recommendedModelKey,
    };
  }

  /**
   * Checks if browser supports WebAssembly execution.
   */
  public async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  }

  public async isWebGpuSupported(): Promise<boolean> {
    return this.isSupported();
  }

  private getCacheManager(): CacheManager {
    if (!this.cacheManager) {
      this.cacheManager = createWllamaCacheManager();
    }
    return this.cacheManager;
  }

  /**
   * Check whether model weights are already cached in OPFS or IndexedDB
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
          f.name.toLowerCase().includes('llama') ||
          f.name.toLowerCase().includes('qwen') ||
          f.name.toLowerCase().includes('.gguf')
      );

      const activeFileLower = activeModel.hfFile.toLowerCase();
      const activeIdLower = activeModel.id.toLowerCase();
      const isCached = modelFiles.some(
        (f) =>
          (f.name.toLowerCase().includes(activeIdLower) ||
            f.name.toLowerCase().includes(activeFileLower)) &&
          f.size > 200 * 1024 * 1024
      );

      const cachedBytes = modelFiles.reduce((acc, f) => acc + (f.size || 0), 0);

      if (typeof window !== 'undefined') {
        if (isCached) {
          localStorage.setItem(`foerderplaner_model_cached_${activeModel.id}`, 'true');
        } else {
          localStorage.removeItem(`foerderplaner_model_cached_${activeModel.id}`);
        }
      }

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
      const hasLocalFlag =
        typeof window !== 'undefined' &&
        localStorage.getItem(`foerderplaner_model_cached_${activeModel.id}`) === 'true';
      return {
        isSupported: true,
        isCached: hasLocalFlag,
        isLoaded: !!this.wllama && this.currentLoadedModelId === activeModel.id,
        storageBackend,
        cacheKeys: [],
        activeModelName: activeModel.name,
      };
    }
  }

  public isModelCachedLocally(): boolean {
    const activeModel = this.getModelConfig();
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`foerderplaner_model_cached_${activeModel.id}`) === 'true';
    }
    return false;
  }

  /**
   * Clears cached model weights from OPFS and IndexedDB
   */
  public async purgeModelCache(): Promise<boolean> {
    await this.unloadModel();
    this.cacheManager = null;
    return await purgeAllWllamaStorage();
  }

  /**
   * Unloads the model from RAM immediately, terminating the WebAssembly instance
   * and releasing all memory back to the browser and OS.
   */
  public async unloadModel(): Promise<void> {
    if (this.wllama) {
      try {
        await this.wllama.exit();
      } catch (e) {
        console.warn('Wllama exit non-fatal:', e);
      }
      this.wllama = null;
      this.currentLoadedModelId = null;
      this.currentLoadedContext = null;
    }
  }

  /**
   * Initialize or load the GGUF model in Wllama with dynamic context and optimal hardware parameters.
   */
  public async initModel(
    onProgress?: ProgressCallback,
    requestedContextTokens?: number
  ): Promise<Wllama> {
    const modelConfig = this.getModelConfig();
    const hw = detectDeviceHardware();
    const targetCtx = requestedContextTokens || modelConfig.contextWindow;

    // If model is already loaded with matching ID and context >= targetCtx, reuse it
    if (
      this.wllama &&
      this.currentLoadedModelId === modelConfig.id &&
      this.currentLoadedContext &&
      this.currentLoadedContext >= targetCtx
    ) {
      return this.wllama;
    }

    if (this.isLoading) {
      throw new Error('Modell wird bereits geladen. Bitte kurz warten.');
    }

    // Clean up any previously loaded model instance
    await this.unloadModel();

    this.isLoading = true;

    // Acquire Screen Wake Lock during download/loading
    let wakeLock: any = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('Screen wakeLock request non-fatal:', e);
      }
    }

    try {
      await ensureStoragePersistence();

      const cm = this.getCacheManager();
      const baseUrl = import.meta.env.BASE_URL || './';
      const wasmPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}wllama.wasm`;

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
      const threadCount = hw.physicalCores;

      let lastErr: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.wllama.loadModelFromHF(
            {
              repo: modelConfig.hfRepo,
              file: modelConfig.hfFile,
            },
            {
              useCache: true,
              n_gpu_layers: 0, // Strict CPU WebAssembly
              n_threads: threadCount, // Adapted to available physical cores
              embeddings: false, // Explicitly disable embeddings as requested
              n_ctx: targetCtx, // Dynamically derived minimum context
              n_parallel: 1, // Single-user in-browser sequence
              cache_type_k: 'q8_0', // 8-bit quantized KV cache K
              cache_type_v: 'q8_0', // 8-bit quantized KV cache V
              progressCallback: ({ loaded, total }) => {
                const progress = total > 0 ? loaded / total : 0;
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const loadedMB = Math.round(loaded / (1024 * 1024));
                const totalMB = Math.round(total / (1024 * 1024));

                if (onProgress) {
                  onProgress({
                    progress,
                    text:
                      total > 0
                        ? `Lade ${modelConfig.shortName} (${loadedMB} MB von ${totalMB} MB)...`
                        : `Lade Daten (${loadedMB} MB)...`,
                    timeElapsed: elapsed,
                  });
                }
              },
            }
          );
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`Model loading attempt ${attempt}/3 encountered issue:`, err);
          if (attempt < 3) {
            if (onProgress) {
              onProgress({
                progress: 0,
                text: `Netzwerkunterbrechung erkannt. Starte erneuten Versuch ${attempt + 1}/3...`,
                timeElapsed: Math.round((Date.now() - startTime) / 1000),
              });
            }
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw err;
        }
      }

      if (lastErr) throw lastErr;

      this.currentLoadedModelId = modelConfig.id;
      this.currentLoadedContext = targetCtx;
      this.isLoading = false;

      if (typeof window !== 'undefined') {
        localStorage.setItem(`foerderplaner_model_cached_${modelConfig.id}`, 'true');
      }

      if (onProgress) {
        onProgress({
          progress: 1,
          text: `Modell (${modelConfig.shortName}) erfolgreich initialisiert!`,
          timeElapsed: Math.round((Date.now() - startTime) / 1000),
        });
      }

      return this.wllama;
    } catch (err: any) {
      this.isLoading = false;
      await this.unloadModel();
      throw err;
    } finally {
      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch {
          // ignore
        }
      }
    }
  }

  public abortGeneration(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Runs local streaming inference on-demand:
   * 1. Evaluates required tokens for the dynamic prompt and sets minimum context.
   * 2. Starts Wllama on-demand.
   * 3. Streams completion with optimal sampling parameters (temp: 0.3, top_p: 0.85, top_k: 40, repeat_penalty: 1.15, repeat_last_n: 64).
   * 4. Stops and unloads the model immediately upon completion or cancellation, freeing RAM.
   */
  public async generateStreaming(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, fullText: string, stats: GenerationStats) => void,
    onInitProgress?: ProgressCallback,
    externalSignal?: AbortSignal
  ): Promise<string> {
    // Dynamically derive minimum context required by actual prompt
    const requiredCtx = calculateRequiredContext(systemPrompt, userPrompt, 420);

    // Start model on-demand with minimal required context
    await this.initModel(onInitProgress, requiredCtx);

    if (!this.wllama) {
      throw new Error('Initialisierung des lokalen Modells fehlgeschlagen.');
    }

    this.currentAbortController = new AbortController();
    const abortCtrl = this.currentAbortController;

    let wakeLock: any = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // non-fatal
      }
    }

    let fullText = '';
    let tokenCount = 0;
    const startTime = Date.now();
    let isInterrupted = false;

    const checkAborted = () => {
      return abortCtrl.signal.aborted || (externalSignal && externalSignal.aborted);
    };

    try {
      // Optimal sampling parameters verified for Llama-3.2 and Qwen-2.5:
      // temperature: 0.3, top_p: 0.85, top_k: 40, repeat_penalty: 1.15, repeat_last_n: 64
      const stream = await (this.wllama as any).createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temp: 0.3,
        temperature: 0.3,
        top_p: 0.85,
        top_k: 40,
        penalty_repeat: 1.15,
        repeat_penalty: 1.15,
        penalty_last_n: 64,
        repeat_last_n: 64,
        max_tokens: 420,
        stop: [
          '<|eot_id|>',
          '<|end_of_text|>',
          '<|start_header_id|>',
          '<|im_end|>',
          '<|endoftext|>',
          '### Ermutigung',
          '### Bedeutung',
          '### Fazit',
          'Hinweis:',
          'AUFGABE:',
          'Schuelerdaten:',
          'Schülerdaten:',
          'Ausgangslage:',
        ],
      });

      for await (const chunk of stream) {
        if (checkAborted()) {
          isInterrupted = true;
          console.log('Local model inference interrupted by user.');
          break;
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          tokenCount++;
          fullText += delta;
          const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          const tokensPerSec = Math.round((tokenCount / elapsedSec) * 10) / 10;
          onToken(delta, fullText, { tokenCount, tokensPerSec, elapsedSec });

          // Completion guard: once REFLEXION section is generated, detect end of required content
          const reflexionIdx = fullText.toUpperCase().indexOf('REFLEXION');
          if (reflexionIdx !== -1) {
            const afterReflexion = fullText.slice(reflexionIdx);
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

          // Repetition guard 2: detect duplicate sentences across different sections
          const lines = fullText
            .split('\n')
            .map((l) => l.trim().toLowerCase())
            .filter((l) => l.length > 25 && !l.startsWith('ist:') && !l.startsWith('soll:') && !l.startsWith('absp'));
          const uniqueLines = new Set(lines);
          if (lines.length - uniqueLines.size >= 1) {
            console.warn('Cross-section duplicate sentence detected, stopping stream');
            break;
          }
        }
      }
    } finally {
      this.currentAbortController = null;
      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch {
          // ignore
        }
      }
      // CRITICAL: Stop and unload the model immediately when response derived or aborted, freeing RAM
      await this.unloadModel();
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

    if (!isInterrupted) {
      const lastPunctuation = Math.max(
        cleaned.lastIndexOf('.'),
        cleaned.lastIndexOf('!'),
        cleaned.lastIndexOf('?')
      );
      if (lastPunctuation !== -1 && cleaned.length - lastPunctuation > 10) {
        const trailing = cleaned.slice(lastPunctuation + 1).trim();
        if (!trailing.endsWith('.') && trailing.split(' ').length < 8) {
          cleaned = cleaned.slice(0, lastPunctuation + 1).trim();
        }
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
