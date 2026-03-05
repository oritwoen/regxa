# CORE GUIDE

## OVERVIEW
`src/core` defines the stable contract layer: types, errors, PURL parser, registry factory, client behavior, and normalization helpers.

## STRUCTURE
```text
src/core/
|- client.ts      # HTTP, retries, timeout, rate limiter hook
|- registry.ts    # factory registry (`register`/`create`)
|- purl.ts        # parse/build PURL pipeline
|- errors.ts      # typed error hierarchy
|- types.ts       # shared cross-module contracts
|- license.ts     # SPDX normalization utilities
|- repository.ts  # repository URL cleanup
`- index.ts       # core barrel exports
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Registry creation flow | `src/core/registry.ts` | `register` + `create` map-based factory |
| PURL parse/build behavior | `src/core/purl.ts` | Single source of truth for validation and normalization |
| HTTP retries/timeouts | `src/core/client.ts` | Shared retry status list and backoff policy |
| Type-level contract updates | `src/core/types.ts` | Changes cascade to all adapters and CLI |
| Domain-specific errors | `src/core/errors.ts` | Throw these classes from adapters/helpers |
| URL normalization | `src/core/repository.ts` | Canonical repository link cleanup |

## CONVENTIONS
- Throw typed errors (`InvalidPURLError`, `NotFoundError`, `RateLimitError`) instead of plain `Error` in core flows.
- `Client` owns network behavior defaults (`maxRetries`, `timeout`, retry codes).
- `VersionStatus` and `Scope` are closed unions; keep adapter outputs inside allowed values.

## ANTI-PATTERNS
- No direct registry-specific assumptions in core modules.
- No duplicate PURL parsing utilities outside `purl.ts`.
- No hardcoded HTTP behavior in adapters when client defaults exist.

## NOTES
- Keep core adapter-agnostic; keep ecosystem details in `src/registries`.
- Assume changes to `types.ts` require updates in tests and multiple adapters.
