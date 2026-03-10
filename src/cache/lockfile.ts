import type { Storage } from "unstorage";
import { getStorage } from "./storage.ts";

const LOCKFILE_VERSION = 1;
const LOCKFILE_KEY = "__lockfile__";

/** Default TTL per data type (seconds). */
export const DEFAULT_TTL = {
  package: 3600, // 1 hour — package metadata changes rarely
  versions: 1800, // 30 min — new versions published more often
  dependencies: 86400, // 24 hours — deps of a specific version never change
  maintainers: 86400, // 24 hours
} as const;

export type EntryType = keyof typeof DEFAULT_TTL;

/** A single cached entry tracked in the lockfile. */
export interface LockfileEntry {
  /** PURL-style key: 'npm:lodash', 'cargo:serde' */
  key: string;
  /** What kind of data: package, versions, dependencies, maintainers */
  type: EntryType;
  /** Unix timestamp (ms) when fetched */
  fetchedAt: number;
  /** TTL in seconds */
  ttl: number;
  /** Latest version at time of caching (for package entries) */
  latestVersion?: string;
  /** Content hash (sha256 of JSON-serialized value) for integrity */
  integrity: string;
}

/** The full lockfile structure. */
export interface Lockfile {
  version: number;
  entries: Record<string, LockfileEntry>;
}

function emptyLockfile(): Lockfile {
  return { version: LOCKFILE_VERSION, entries: {} };
}

/** Read the lockfile from storage. Returns empty lockfile if not found or invalid. */
export async function readLockfile(storage?: Storage): Promise<Lockfile> {
  const s = storage ?? getStorage();
  try {
    const data = await s.getItem<Lockfile>(LOCKFILE_KEY);
    if (!data || data.version !== LOCKFILE_VERSION) return emptyLockfile();
    return data;
  } catch {
    return emptyLockfile();
  }
}

/** Write the lockfile to storage. */
export async function writeLockfile(lockfile: Lockfile, storage?: Storage): Promise<void> {
  const s = storage ?? getStorage();
  await s.setItem(LOCKFILE_KEY, lockfile);
}

/** Build a cache key from ecosystem + name + type + optional version. */
export function cacheKey(
  ecosystem: string,
  name: string,
  type: EntryType,
  version?: string,
): string {
  const base = `${ecosystem}:${name}:${type}`;
  return version ? `${base}:${version}` : base;
}

/** Check if a lockfile entry is still fresh. */
export function isFresh(entry: LockfileEntry): boolean {
  const expiresAt = entry.fetchedAt + entry.ttl * 1000;
  return Date.now() < expiresAt;
}

/** Get a lockfile entry if it exists and is fresh. Returns null otherwise. */
export function getFreshEntry(lockfile: Lockfile, key: string): LockfileEntry | null {
  const entry = lockfile.entries[key];
  if (!entry) return null;
  if (!isFresh(entry)) return null;
  return entry;
}

/** Upsert an entry in the lockfile. Does NOT persist — call writeLockfile() after. */
export function setEntry(lockfile: Lockfile, entry: LockfileEntry): void {
  lockfile.entries[entry.key] = entry;
}

/** Remove an entry from the lockfile. */
export function removeEntry(lockfile: Lockfile, key: string): void {
  delete lockfile.entries[key];
}

/** Remove all stale entries from the lockfile. Returns count of removed entries. */
export function pruneStale(lockfile: Lockfile): number {
  let removed = 0;
  for (const key of Object.keys(lockfile.entries)) {
    if (!isFresh(lockfile.entries[key]!)) {
      delete lockfile.entries[key];
      removed++;
    }
  }
  return removed;
}
