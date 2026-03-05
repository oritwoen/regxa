# CACHE GUIDE

## OVERVIEW
`src/cache` is an optional decorator subsystem that adds storage-backed reads and lockfile freshness checks around registry operations.

## STRUCTURE
```text
src/cache/
|- cached-registry.ts  # registry decorator with cache read/write flow
|- lockfile.ts         # freshness metadata + TTL + integrity
|- storage.ts          # unstorage setup and lifecycle
|- paths.ts            # OS-specific cache directory selection
`- index.ts            # cache public exports + createCached
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Cache wrapper behavior | `src/cache/cached-registry.ts` | Read-through/write-through wrapper for `Registry` |
| Freshness and TTL policy | `src/cache/lockfile.ts` | `DEFAULT_TTL`, integrity, stale pruning |
| Storage lifecycle | `src/cache/storage.ts` | Global storage config + disposal/clear hooks |
| Platform path behavior | `src/cache/paths.ts` | Linux/macOS/Windows cache directory rules |
| Public cache entry points | `src/cache/index.ts` | Exports + `createCached` convenience API |

## CONVENTIONS
- Cache is optional; uncached path must remain first-class.
- Lockfile integrity hash gates cache reuse.
- `createCached` composes core registry creation with `CachedRegistry`.

## ANTI-PATTERNS
- Do not hardcode TTL values outside `lockfile.ts`.
- Do not bypass lockfile freshness checks for cached reads.
- Do not assume filesystem-only storage; keep `unstorage` driver compatibility.

## NOTES
- Corrupt or stale entries fail soft and trigger network fallback.
- Keep cache-key format stable; lockfile compatibility depends on it.
