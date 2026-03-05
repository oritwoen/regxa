// Cache
export { getCacheDir } from './paths.ts'
export { getStorage, getEcosystemStorage, computeIntegrity, disposeStorage, clearStorage, configureStorage } from './storage.ts'
export { CachedRegistry } from './cached-registry.ts'
export {
  readLockfile,
  writeLockfile,
  cacheKey,
  isFresh,
  getFreshEntry,
  setEntry,
  removeEntry,
  pruneStale,
  DEFAULT_TTL,
} from './lockfile.ts'
export type { Lockfile, LockfileEntry, EntryType } from './lockfile.ts'

// Convenience
import type { Storage } from 'unstorage'
import type { Registry } from '../core/types.ts'
import type { Client } from '../core/client.ts'
import { create } from '../core/registry.ts'
import { CachedRegistry } from './cached-registry.ts'

/** Options for creating a cached registry. */
export interface CreateCachedOptions {
  /** Custom base URL for the registry API. */
  baseURL?: string
  /** Custom HTTP client. */
  client?: Client
  /** Custom unstorage instance. Overrides the globally configured storage. */
  storage?: Storage
}

/** Create a registry instance with caching + lockfile tracking. */
export function createCached(ecosystem: string, options?: CreateCachedOptions): Registry {
  const inner = create(ecosystem, options?.baseURL, options?.client)
  return new CachedRegistry(inner, options?.storage)
}
