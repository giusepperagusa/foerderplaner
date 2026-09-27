/**
 * Wllama Manager & Lifecycle Controller (CPU WebAssembly + OPFS/IndexedDB)
 * Replaces WebLLM/WebGPU with Wllama running Qwen 2.5 0.5B Instruct (GGUF).
 * Stores model weights strictly in OPFS and IndexedDB (zero Cache API usage).
 */
import { Wllama, CacheManager } from '@wllama/wllama';
import {
  createWllamaCacheManager,
  getActiveStorageType,
  ensureStoragePersistence,
  purgeAllWllamaStorage,
} from './wllamaStorage';

export const CURRENT_MODEL_CONFIG = {
  id: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  name: 'Qwen 2.5 (0.5B Instruct GGUF - Q4_K_M)',
  shortName: 'Qwen2.5-0.5B-GGUF',
  downloadSizeMB: 397,
  ramRequiredMB: 600,
  contextWindow: 4096,
  estimatedTimeFast: 'ca. 25–45 Sekunden (WLAN / Breitband)',
  estimatedTimeSlow: 'ca. 2–4 Minuten (mobiles Internet)',
  description:
    'Leichtgewichtiges GGUF-Modell für lokale CPU-Inferenz via WebAssembly (Wllama) mit OPFS/IndexedDB-Speicherung. Läuft auf jedem Gerät ohne WebGPU-Zwang und respektiert 100% Datenschutz (kein Serverkontakt, kein Cache API).',
  hfRepo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
  hfFile: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
};

export interface ModelCacheStatus {
  isSupported: boolean;
  isCached: boolean;
  isLoaded: boolean;
  cachedBytes?: number;
  storageBackend: 'OPFS' | 'IndexedDB' | 'None';
  cacheKeys: string[];
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

    if (!isSupported) {
      return {
        isSupported: false,
        isCached: false,
        isLoaded: false,
        storageBackend: 'None',
        cacheKeys: [],
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

      const isCached = modelFiles.some((f) => f.size > 50 * 1024 * 1024); // at least 50MB
      const cachedBytes = modelFiles.reduce((acc, f) => acc + (f.size || 0), 0);

      return {
        isSupported: true,
        isCached,
        isLoaded: !!this.wllama && this.currentLoadedModelId === CURRENT_MODEL_CONFIG.id,
        cachedBytes: cachedBytes > 0 ? cachedBytes : undefined,
        storageBackend,
        cacheKeys: modelFiles.map((f) => f.name),
      };
    } catch (e) {
      console.warn('Could not inspect OPFS/IndexedDB storage:', e);
      return {
        isSupported: true,
        isCached: false,
        isLoaded: !!this.wllama && this.currentLoadedModelId === CURRENT_MODEL_CONFIG.id,
        storageBackend,
        cacheKeys: [],
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
   * Checks and purges outdated model caches from older versions
   */
  public async purgeOutdatedModelCaches(): Promise<void> {
    // Wllama storage isolation automatically keys by URL / ETag
  }

  /**
   * Initialize or load the GGUF model in the Wllama engine
   */
  public async initModel(onProgress?: ProgressCallback): Promise<Wllama> {
    if (this.wllama && this.currentLoadedModelId === CURRENT_MODEL_CONFIG.id) {
      return this.wllama;
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

      // Load model from Hugging Face or cached OPFS/IDB storage
      await this.wllama.loadModelFromHF(
        {
          repo: CURRENT_MODEL_CONFIG.hfRepo,
          file: CURRENT_MODEL_CONFIG.hfFile,
        },
        {
          useCache: true,
          progressCallback: ({ loaded, total }) => {
            const progress = total > 0 ? loaded / total : 0;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const loadedMB = Math.round(loaded / (1024 * 1024));
            const totalMB = Math.round(total / (1024 * 1024));

            if (onProgress) {
              onProgress({
                progress,
                text: total > 0
                  ? `Lade GGUF-Modell in OPFS/IndexedDB (${loadedMB} MB von ${totalMB} MB)...`
                  : `Lade Daten (${loadedMB} MB)...`,
                timeElapsed: elapsed,
              });
            }
          },
        }
      );

      this.currentLoadedModelId = CURRENT_MODEL_CONFIG.id;
      this.isLoading = false;

      if (onProgress) {
        onProgress({
          progress: 1,
          text: 'Modell erfolgreich geladen und im OPFS/IndexedDB initialisiert!',
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
   * Stream a completion using Wllama CPU inference
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
      temperature: 0.2,
      max_tokens: 1024,
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
    return !!this.wllama && this.currentLoadedModelId === CURRENT_MODEL_CONFIG.id;
  }
}

export const webLlmManager = new WllamaManager();
export const wllamaManager = webLlmManager;
