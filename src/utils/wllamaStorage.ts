/**
 * Storage Backends for Wllama Model Weights
 * Strictly utilizes OPFS (Origin Private File System) and IndexedDB.
 * Completely avoids and rejects the Cache Storage API (window.caches).
 */

import { CacheManager } from '@wllama/wllama';

export interface StorageFileHint {
  sha256?: string;
}

export interface StorageBackend {
  isSupported(): boolean;
  read(key: string, hint?: StorageFileHint): Promise<Blob | null>;
  write(key: string, stream: ReadableStream, hint?: StorageFileHint): Promise<void>;
  getSize(key: string, hint?: StorageFileHint): Promise<number>;
  list(): Promise<Array<{ key: string; size: number }>>;
  delete(key: string): Promise<void>;
}

const OPFS_DIR_NAME = 'wllama_models';

/**
 * OPFS (Origin Private File System) Backend
 * High-performance, streaming-capable storage directly in browser private filesystem.
 */
export class OPFSStorageBackend implements StorageBackend {
  public isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage?.getDirectory === 'function'
    );
  }

  private async getDirectory(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
  }

  public async read(key: string): Promise<Blob | null> {
    try {
      const dir = await this.getDirectory();
      const fileHandle = await dir.getFileHandle(key);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  public async write(key: string, stream: ReadableStream): Promise<void> {
    const dir = await this.getDirectory();
    const fileHandle = await dir.getFileHandle(key, { create: true });
    
    // In workers or browsers supporting createWritable
    if ('createWritable' in fileHandle) {
      const writable = await (fileHandle as any).createWritable();
      try {
        await writable.truncate(0);
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            await writable.write(value);
          }
        }
      } finally {
        await writable.close();
      }
    } else {
      // Fallback for environments where createWritable is restricted
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const blob = new Blob(chunks as any);
      // Access handle sync write if in worker or standard write
      if ('createSyncAccessHandle' in fileHandle) {
        const accessHandle = await (fileHandle as any).createSyncAccessHandle();
        try {
          accessHandle.truncate(0);
          const buffer = await blob.arrayBuffer();
          accessHandle.write(buffer, { at: 0 });
          accessHandle.flush();
        } finally {
          accessHandle.close();
        }
      }
    }
  }

  public async getSize(key: string): Promise<number> {
    try {
      const dir = await this.getDirectory();
      const fileHandle = await dir.getFileHandle(key);
      const file = await fileHandle.getFile();
      return file.size;
    } catch {
      return -1;
    }
  }

  public async list(): Promise<Array<{ key: string; size: number }>> {
    try {
      const dir = await this.getDirectory();
      const result: Array<{ key: string; size: number }> = [];
      // @ts-ignore
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file') {
          const file = await (handle as FileSystemFileHandle).getFile();
          result.push({ key: name, size: file.size });
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const dir = await this.getDirectory();
      await dir.removeEntry(key);
    } catch (e: any) {
      if (e?.name !== 'NotFoundError') {
        console.warn('Error deleting OPFS entry:', e);
      }
    }
  }
}

const IDB_DATABASE_NAME = 'wllama_models_db';
const IDB_STORE_NAME = 'model_files';

/**
 * IndexedDB Storage Backend
 * Solid fallback for browsers or frames where OPFS is unavailable or blocked.
 * Does NOT use Cache API.
 */
export class IDBStorageBackend implements StorageBackend {
  public isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DATABASE_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async read(key: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  public async write(key: string, stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const blob = new Blob(chunks as any);
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put({
        key,
        blob,
        size: blob.size,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getSize(key: string): Promise<number> {
    try {
      const blob = await this.read(key);
      return blob ? blob.size : -1;
    } catch {
      return -1;
    }
  }

  public async list(): Promise<Array<{ key: string; size: number }>> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || []).map((r: any) => ({
            key: r.key,
            size: r.size || (r.blob ? r.blob.size : 0)
          }));
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Error deleting IndexedDB model file:', e);
    }
  }
}

/**
 * Creates a Wllama CacheManager configured strictly with OPFS first, falling back to IndexedDB.
 * Neither backend touches window.caches.
 */
export function createWllamaCacheManager(): CacheManager {
  return new CacheManager([
    new OPFSStorageBackend(),
    new IDBStorageBackend()
  ]);
}

/**
 * Detects which non-Cache-API storage backend is currently active
 */
export async function getActiveStorageType(): Promise<'OPFS' | 'IndexedDB' | 'None'> {
  const opfs = new OPFSStorageBackend();
  if (opfs.isSupported()) {
    try {
      await opfs.list();
      return 'OPFS';
    } catch {
      // Fall through to IDB
    }
  }

  const idb = new IDBStorageBackend();
  if (idb.isSupported()) {
    return 'IndexedDB';
  }

  return 'None';
}

/**
 * Requests persistent storage from the browser so the model is not evicted
 */
export async function ensureStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Clears all model caches in OPFS, IndexedDB, and purges any leftover legacy WebLLM caches.
 */
export async function purgeAllWllamaStorage(): Promise<boolean> {
  let cleared = false;

  // 1. Clear OPFS
  try {
    const opfs = new OPFSStorageBackend();
    if (opfs.isSupported()) {
      const files = await opfs.list();
      for (const file of files) {
        await opfs.delete(file.key);
        cleared = true;
      }
    }
  } catch (e) {
    console.warn('OPFS purge warning:', e);
  }

  // 2. Clear IndexedDB
  try {
    const idb = new IDBStorageBackend();
    if (idb.isSupported()) {
      const files = await idb.list();
      for (const file of files) {
        await idb.delete(file.key);
        cleared = true;
      }
    }
  } catch (e) {
    console.warn('IDB purge warning:', e);
  }

  // 3. Clean up any leftover legacy WebLLM CacheStorage entries from previous versions
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      for (const key of keys) {
        if (
          key.toLowerCase().includes('webllm') ||
          key.toLowerCase().includes('qwen') ||
          key.toLowerCase().includes('mlc')
        ) {
          await window.caches.delete(key);
          cleared = true;
        }
      }
    } catch {
      // Ignore
    }
  }

  return cleared;
}
