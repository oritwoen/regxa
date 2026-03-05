import { createStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TTL,
  cacheKey,
  isFresh,
  getFreshEntry,
  setEntry,
  removeEntry,
  pruneStale,
  readLockfile,
  writeLockfile,
} from '../../src/cache/lockfile.ts'
import { computeIntegrity } from '../../src/cache/storage.ts'
import type { Lockfile, LockfileEntry } from '../../src/cache/lockfile.ts'

describe('lockfile', () => {
  describe('DEFAULT_TTL', () => {
    it('has correct TTL values for each entry type', () => {
      expect(DEFAULT_TTL.package).toBe(3600)
      expect(DEFAULT_TTL.versions).toBe(1800)
      expect(DEFAULT_TTL.dependencies).toBe(86400)
      expect(DEFAULT_TTL.maintainers).toBe(86400)
    })

    it('contains all required entry types', () => {
      expect(DEFAULT_TTL).toHaveProperty('package')
      expect(DEFAULT_TTL).toHaveProperty('versions')
      expect(DEFAULT_TTL).toHaveProperty('dependencies')
      expect(DEFAULT_TTL).toHaveProperty('maintainers')
    })
  })

  describe('cacheKey', () => {
    it('builds key without version', () => {
      const key = cacheKey('npm', 'lodash', 'package')
      expect(key).toBe('npm:lodash:package')
    })

    it('builds key with version', () => {
      const key = cacheKey('npm', 'lodash', 'dependencies', '4.17.21')
      expect(key).toBe('npm:lodash:dependencies:4.17.21')
    })

    it('handles different ecosystems', () => {
      const npmKey = cacheKey('npm', 'pkg', 'versions')
      const cargoKey = cacheKey('cargo', 'pkg', 'versions')
      expect(npmKey).not.toBe(cargoKey)
    })

    it('handles scoped package names', () => {
      const key = cacheKey('npm', '@babel/core', 'package')
      expect(key).toBe('npm:@babel/core:package')
    })
  })

  describe('isFresh', () => {
    it('returns true for entry within TTL', () => {
      const entry: LockfileEntry = {
        key: 'npm:lodash:package',
        type: 'package',
        fetchedAt: Date.now() - 1000, // 1 second ago
        ttl: 3600,
        integrity: 'sha256-abc123',
      }
      expect(isFresh(entry)).toBe(true)
    })

    it('returns false for expired entry', () => {
      const entry: LockfileEntry = {
        key: 'npm:lodash:package',
        type: 'package',
        fetchedAt: Date.now() - 4000000, // way in the past
        ttl: 3600,
        integrity: 'sha256-abc123',
      }
      expect(isFresh(entry)).toBe(false)
    })

    it('returns false at exact expiration time', () => {
      const now = Date.now()
      const entry: LockfileEntry = {
        key: 'npm:lodash:package',
        type: 'package',
        fetchedAt: now - 3600000, // exactly 1 hour ago
        ttl: 3600,
        integrity: 'sha256-abc123',
      }
      // At exact expiration, should be false (not fresh)
      expect(isFresh(entry)).toBe(false)
    })

    it('handles different TTL values', () => {
      const now = Date.now()
      const shortTTL: LockfileEntry = {
        key: 'npm:pkg:versions',
        type: 'versions',
        fetchedAt: now - 1000,
        ttl: 1800, // 30 min
        integrity: 'sha256-abc123',
      }
      const longTTL: LockfileEntry = {
        key: 'npm:pkg:dependencies',
        type: 'dependencies',
        fetchedAt: now - 1000,
        ttl: 86400, // 24 hours
        integrity: 'sha256-abc123',
      }
      expect(isFresh(shortTTL)).toBe(true)
      expect(isFresh(longTTL)).toBe(true)
    })
  })

  describe('getFreshEntry', () => {
    it('returns entry if fresh', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now() - 1000,
            ttl: 3600,
            integrity: 'sha256-abc123',
          },
        },
      }
      const entry = getFreshEntry(lockfile, 'npm:lodash:package')
      expect(entry).not.toBeNull()
      expect(entry?.key).toBe('npm:lodash:package')
    })

    it('returns null if entry does not exist', () => {
      const lockfile: Lockfile = { version: 1, entries: {} }
      const entry = getFreshEntry(lockfile, 'npm:nonexistent:package')
      expect(entry).toBeNull()
    })

    it('returns null if entry is stale', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now() - 4000000,
            ttl: 3600,
            integrity: 'sha256-abc123',
          },
        },
      }
      const entry = getFreshEntry(lockfile, 'npm:lodash:package')
      expect(entry).toBeNull()
    })

    it('returns null if entry exists but is not fresh', () => {
      const now = Date.now()
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:pkg:versions': {
            key: 'npm:pkg:versions',
            type: 'versions',
            fetchedAt: now - 2000000, // expired
            ttl: 1800,
            integrity: 'sha256-xyz789',
          },
        },
      }
      const entry = getFreshEntry(lockfile, 'npm:pkg:versions')
      expect(entry).toBeNull()
    })
  })

  describe('setEntry', () => {
    it('adds new entry to lockfile', () => {
      const lockfile: Lockfile = { version: 1, entries: {} }
      const entry: LockfileEntry = {
        key: 'npm:lodash:package',
        type: 'package',
        fetchedAt: Date.now(),
        ttl: 3600,
        integrity: 'sha256-abc123',
      }
      setEntry(lockfile, entry)
      expect(lockfile.entries['npm:lodash:package']).toBe(entry)
    })

    it('overwrites existing entry', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now() - 10000,
            ttl: 3600,
            integrity: 'sha256-old',
          },
        },
      }
      const newEntry: LockfileEntry = {
        key: 'npm:lodash:package',
        type: 'package',
        fetchedAt: Date.now(),
        ttl: 3600,
        integrity: 'sha256-new',
      }
      setEntry(lockfile, newEntry)
      expect(lockfile.entries['npm:lodash:package']?.integrity).toBe('sha256-new')
    })

    it('preserves other entries', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now(),
            ttl: 3600,
            integrity: 'sha256-lodash',
          },
        },
      }
      const newEntry: LockfileEntry = {
        key: 'npm:react:package',
        type: 'package',
        fetchedAt: Date.now(),
        ttl: 3600,
        integrity: 'sha256-react',
      }
      setEntry(lockfile, newEntry)
      expect(Object.keys(lockfile.entries)).toHaveLength(2)
      expect(lockfile.entries['npm:lodash:package']).toBeDefined()
      expect(lockfile.entries['npm:react:package']).toBeDefined()
    })
  })

  describe('removeEntry', () => {
    it('removes entry from lockfile', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now(),
            ttl: 3600,
            integrity: 'sha256-abc123',
          },
        },
      }
      removeEntry(lockfile, 'npm:lodash:package')
      expect(lockfile.entries['npm:lodash:package']).toBeUndefined()
    })

    it('does nothing if entry does not exist', () => {
      const lockfile: Lockfile = { version: 1, entries: {} }
      expect(() => {
        removeEntry(lockfile, 'npm:nonexistent:package')
      }).not.toThrow()
      expect(lockfile.entries).toEqual({})
    })

    it('preserves other entries', () => {
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now(),
            ttl: 3600,
            integrity: 'sha256-lodash',
          },
          'npm:react:package': {
            key: 'npm:react:package',
            type: 'package',
            fetchedAt: Date.now(),
            ttl: 3600,
            integrity: 'sha256-react',
          },
        },
      }
      removeEntry(lockfile, 'npm:lodash:package')
      expect(lockfile.entries['npm:react:package']).toBeDefined()
      expect(lockfile.entries['npm:lodash:package']).toBeUndefined()
    })
  })

  describe('pruneStale', () => {
    it('removes stale entries', () => {
      const now = Date.now()
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:fresh:package': {
            key: 'npm:fresh:package',
            type: 'package',
            fetchedAt: now - 1000,
            ttl: 3600,
            integrity: 'sha256-fresh',
          },
          'npm:stale:package': {
            key: 'npm:stale:package',
            type: 'package',
            fetchedAt: now - 4000000,
            ttl: 3600,
            integrity: 'sha256-stale',
          },
        },
      }
      const removed = pruneStale(lockfile)
      expect(removed).toBe(1)
      expect(lockfile.entries['npm:fresh:package']).toBeDefined()
      expect(lockfile.entries['npm:stale:package']).toBeUndefined()
    })

    it('returns 0 when no stale entries', () => {
      const now = Date.now()
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:fresh1:package': {
            key: 'npm:fresh1:package',
            type: 'package',
            fetchedAt: now - 1000,
            ttl: 3600,
            integrity: 'sha256-fresh1',
          },
          'npm:fresh2:package': {
            key: 'npm:fresh2:package',
            type: 'package',
            fetchedAt: now - 2000,
            ttl: 3600,
            integrity: 'sha256-fresh2',
          },
        },
      }
      const removed = pruneStale(lockfile)
      expect(removed).toBe(0)
      expect(Object.keys(lockfile.entries)).toHaveLength(2)
    })

    it('removes all entries when all are stale', () => {
      const now = Date.now()
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:stale1:package': {
            key: 'npm:stale1:package',
            type: 'package',
            fetchedAt: now - 4000000,
            ttl: 3600,
            integrity: 'sha256-stale1',
          },
          'npm:stale2:package': {
            key: 'npm:stale2:package',
            type: 'package',
            fetchedAt: now - 5000000,
            ttl: 3600,
            integrity: 'sha256-stale2',
          },
        },
      }
      const removed = pruneStale(lockfile)
      expect(removed).toBe(2)
      expect(Object.keys(lockfile.entries)).toHaveLength(0)
    })

    it('handles empty lockfile', () => {
      const lockfile: Lockfile = { version: 1, entries: {} }
      const removed = pruneStale(lockfile)
      expect(removed).toBe(0)
    })

    it('respects different TTL values', () => {
      const now = Date.now()
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:pkg:versions': {
            key: 'npm:pkg:versions',
            type: 'versions',
            fetchedAt: now - 2000000, // expired (TTL 1800)
            ttl: 1800,
            integrity: 'sha256-versions',
          },
          'npm:pkg:dependencies': {
            key: 'npm:pkg:dependencies',
            type: 'dependencies',
            fetchedAt: now - 2000000, // fresh (TTL 86400)
            ttl: 86400,
            integrity: 'sha256-deps',
          },
        },
      }
      const removed = pruneStale(lockfile)
      expect(removed).toBe(1)
      expect(lockfile.entries['npm:pkg:versions']).toBeUndefined()
      expect(lockfile.entries['npm:pkg:dependencies']).toBeDefined()
    })
  })

  describe('readLockfile / writeLockfile', () => {
    it('writes and reads lockfile with correct structure', async () => {
      const storage = createStorage({ driver: memoryDriver() })
      const lockfile: Lockfile = {
        version: 1,
        entries: {
          'npm:lodash:package': {
            key: 'npm:lodash:package',
            type: 'package',
            fetchedAt: Date.now(),
            ttl: 3600,
            integrity: 'sha256-abc123',
          },
        },
      }

      await writeLockfile(lockfile, storage)

      const read = await readLockfile(storage)
      expect(read.version).toBe(1)
      expect(read.entries['npm:lodash:package']).toBeDefined()
      expect(read.entries['npm:lodash:package']?.integrity).toBe('sha256-abc123')
    })

    it('returns empty lockfile when storage is empty', async () => {
      const storage = createStorage({ driver: memoryDriver() })
      const lockfile = await readLockfile(storage)
      expect(lockfile.version).toBe(1)
      expect(lockfile.entries).toEqual({})
    })

    it('returns empty lockfile on invalid version', async () => {
      const storage = createStorage({ driver: memoryDriver() })
      await storage.setItem('__lockfile__', { version: 999, entries: {} })
      const lockfile = await readLockfile(storage)
      expect(lockfile.version).toBe(1)
      expect(lockfile.entries).toEqual({})
    })
  })

  describe('computeIntegrity', () => {
    it('computes sha256 hash of JSON value', () => {
      const value = { name: 'lodash', version: '4.17.21' }
      const integrity = computeIntegrity(value)
      expect(integrity).toMatch(/^sha256-[a-f0-9]{64}$/)
    })

    it('produces same hash for same value', () => {
      const value = { name: 'lodash', version: '4.17.21' }
      const hash1 = computeIntegrity(value)
      const hash2 = computeIntegrity(value)
      expect(hash1).toBe(hash2)
    })

    it('produces different hash for different values', () => {
      const value1 = { name: 'lodash', version: '4.17.21' }
      const value2 = { name: 'lodash', version: '4.17.22' }
      const hash1 = computeIntegrity(value1)
      const hash2 = computeIntegrity(value2)
      expect(hash1).not.toBe(hash2)
    })

    it('handles arrays', () => {
      const arr = [{ id: 1 }, { id: 2 }]
      const integrity = computeIntegrity(arr)
      expect(integrity).toMatch(/^sha256-[a-f0-9]{64}$/)
    })

    it('handles primitives', () => {
      const str = computeIntegrity('hello')
      const num = computeIntegrity(42)
      const bool = computeIntegrity(true)
      expect(str).toMatch(/^sha256-[a-f0-9]{64}$/)
      expect(num).toMatch(/^sha256-[a-f0-9]{64}$/)
      expect(bool).toMatch(/^sha256-[a-f0-9]{64}$/)
    })
  })
})
