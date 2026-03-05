import { createStorage, prefixStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import type { Storage } from 'unstorage'
import { getCacheDir } from './paths.ts'
import { hash } from 'node:crypto'

let _storage: Storage | undefined

/**
 * Configure a custom unstorage instance for unpux.
 * Call this before any cache operations to use a non-default driver
 * (e.g. Cloudflare KV, Redis, memory).
 */
export function configureStorage(storage: Storage): void {
  _storage = storage
}

/** Get or create the shared storage instance. Uses configured storage or falls back to fs driver. */
export function getStorage(): Storage {
  if (!_storage) {
    _storage = createStorage({
      driver: fsDriver({ base: getCacheDir() }),
    })
  }
  return _storage
}

/** Get a namespaced storage for a specific ecosystem (e.g. 'npm', 'cargo'). */
export function getEcosystemStorage(ecosystem: string): Storage {
  return prefixStorage(getStorage(), ecosystem)
}

/** Compute a sha256 integrity hash of a JSON-serializable value. */
export function computeIntegrity(value: unknown): string {
  return `sha256-${hash('sha256', JSON.stringify(value), 'hex')}`
}

/** Dispose the storage instance. Call on process exit. */
export async function disposeStorage(): Promise<void> {
  if (_storage) {
    await _storage.dispose()
    _storage = undefined
  }
}

/** Clear all cached data. */
export async function clearStorage(): Promise<void> {
  await getStorage().clear()
}
