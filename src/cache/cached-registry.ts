import type {
  Dependency,
  Maintainer,
  Package,
  Registry,
  URLBuilder,
  Version,
} from "../core/types.ts";
import { getStorage, computeIntegrity } from "./storage.ts";
import {
  readLockfile,
  writeLockfile,
  cacheKey,
  getFreshEntry,
  setEntry,
  DEFAULT_TTL,
} from "./lockfile.ts";
import type { EntryType, LockfileEntry } from "./lockfile.ts";
import type { Storage } from "unstorage";

/**
 * CachedRegistry wraps any Registry and adds caching backed by unstorage
 * with a lockfile for freshness tracking.
 *
 * Pass a custom `storage` to use a non-default driver (e.g. Cloudflare KV).
 * If omitted, uses the globally configured storage (see `configureStorage()`).
 */
export class CachedRegistry implements Registry {
  readonly inner: Registry;
  readonly storage: Storage;
  private readonly lockfileStorage: Storage;

  constructor(inner: Registry, storage?: Storage) {
    this.inner = inner;
    this.storage = storage ?? getStorage();
    this.lockfileStorage = storage ?? getStorage();
  }

  ecosystem(): string {
    return this.inner.ecosystem();
  }

  urls(): URLBuilder {
    return this.inner.urls();
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    return this.cached<Package>(
      name,
      "package",
      undefined,
      () => this.inner.fetchPackage(name, signal),
      (value) => ({ latestVersion: value.latestVersion }),
    );
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    return this.cached<Version[]>(name, "versions", undefined, () =>
      this.inner.fetchVersions(name, signal),
    );
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    return this.cached<Dependency[]>(name, "dependencies", version, () =>
      this.inner.fetchDependencies(name, version, signal),
    );
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    return this.cached<Maintainer[]>(name, "maintainers", undefined, () =>
      this.inner.fetchMaintainers(name, signal),
    );
  }

  /**
   * Generic cache-through method:
   * 1. Check lockfile for fresh entry
   * 2. If fresh -> read from storage
   * 3. If stale/missing -> fetch, store, update lockfile
   */
  private async cached<T>(
    name: string,
    type: EntryType,
    version: string | undefined,
    fetcher: () => Promise<T>,
    extraMeta?: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    const eco = this.inner.ecosystem();
    const key = cacheKey(eco, name, type, version);
    const storageKey = key;

    // 1. Check lockfile
    const lockfile = await readLockfile(this.lockfileStorage);
    const entry = getFreshEntry(lockfile, key);

    if (entry) {
      // 2. Read from storage
      const cached = await this.storage.getItem<T>(storageKey);
      if (cached !== null) {
        // Verify integrity
        const currentHash = computeIntegrity(cached);
        if (currentHash === entry.integrity) {
          return cached;
        }
        // Integrity mismatch — refetch
      }
    }

    // 3. Fetch fresh data
    const value = await fetcher();

    // Store to storage
    await this.storage.setItem(storageKey, value as Record<string, unknown>);

    // Update lockfile entry
    const meta = extraMeta ? extraMeta(value) : {};
    const newEntry: LockfileEntry = {
      key,
      type,
      fetchedAt: Date.now(),
      ttl: DEFAULT_TTL[type],
      integrity: computeIntegrity(value),
      ...("latestVersion" in meta ? { latestVersion: meta["latestVersion"] as string } : {}),
    };
    setEntry(lockfile, newEntry);
    await writeLockfile(lockfile, this.lockfileStorage);

    return value;
  }
}
