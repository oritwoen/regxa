# TEST GUIDE

## OVERVIEW
`test/` is split into deterministic unit coverage and live-network e2e smoke checks under Vitest projects.

## STRUCTURE
```text
test/
|- unit/  # focused unit suites per module
`- e2e/   # smoke tests against live registries
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| PURL contract tests | `test/unit/purl.test.ts` | Parse/build validation matrix |
| Registry factory + plugin tests | `test/unit/registry.test.ts`, `test/unit/registries.test.ts` | Registration + per-ecosystem behavior |
| Cache behavior tests | `test/unit/lockfile.test.ts`, `test/unit/cached-registry.test.ts` | Freshness, TTL, integrity, wrapper behavior |
| Normalization tests | `test/unit/license.test.ts`, `test/unit/repository.test.ts` | Canonical output normalization |
| Error-type expectations | `test/unit/errors.test.ts` | Custom error classes |
| Live smoke tests | `test/e2e/smoke.test.ts` | Network-sensitive ecosystem checks |

## CONVENTIONS
- Test files use `*.test.ts` naming.
- Vitest globals are enabled (`describe`, `it`, `expect`, `vi` without imports).
- Unit tests rely on mocks/spies; e2e tests use real HTTP.

## ANTI-PATTERNS
- Do not rely on e2e tests for deterministic behavior checks handled by unit suites.
- Do not add module coverage gaps without corresponding unit tests.
- Do not place production helper code under `test/`.
