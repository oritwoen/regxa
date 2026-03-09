// Core API
export { Client, defaultClient } from "./core/client.ts";
export { register, create, ecosystems, has } from "./core/registry.ts";
export { parsePURL, fullName, createFromPURL, buildPURL } from "./core/purl.ts";
export { normalizeLicense, combineLicenses } from "./core/license.ts";
export { normalizeRepositoryURL } from "./core/repository.ts";

// Errors
export {
  PkioError,
  HTTPError,
  NotFoundError,
  RateLimitError,
  UnknownEcosystemError,
  InvalidPURLError,
} from "./core/errors.ts";

// Helpers
export {
  fetchPackageFromPURL,
  fetchVersionsFromPURL,
  fetchDependenciesFromPURL,
  fetchMaintainersFromPURL,
  bulkFetchPackages,
  selectVersion,
  resolveDocsUrl,
  resolveReadmeUrl,
} from "./helpers.ts";

// Types
export type {
  Package,
  Version,
  Dependency,
  Maintainer,
  VersionStatus,
  Scope,
  URLBuilder,
  Registry,
  RegistryFactory,
  ClientOptions,
  RateLimiter,
  ParsedPURL,
} from "./core/types.ts";

// Cache
export { getCacheDir } from "./cache/paths.ts";
export {
  getStorage,
  getEcosystemStorage,
  computeIntegrity,
  disposeStorage,
  clearStorage,
  configureStorage,
} from "./cache/storage.ts";
export { CachedRegistry } from "./cache/cached-registry.ts";
export { createCached } from "./cache/index.ts";
export type { CreateCachedOptions } from "./cache/index.ts";
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
} from "./cache/lockfile.ts";
export type { Lockfile, LockfileEntry, EntryType } from "./cache/lockfile.ts";
