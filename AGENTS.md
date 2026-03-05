# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-05T10:50:45Z
**Commit:** 44b1a3e
**Branch:** main

## OVERVIEW
unpux is an ESM-only TypeScript library + CLI that normalizes package metadata across npm, PyPI, crates.io, RubyGems, and Packagist using PURL-first APIs.
The architecture is layered: `core` abstractions, per-ecosystem `registries`, optional `cache` decorator, and CLI `commands`.

## STRUCTURE
```text
pkio/
|- src/                # source modules and entrypoints
|  |- core/            # contracts, parsing, client, errors
|  |- registries/      # ecosystem adapters
|  |- cache/           # storage and lockfile caching
|  |- commands/        # citty command handlers
|  |- index.ts         # public API barrel
|  `- cli.ts           # executable entrypoint
|- test/               # unit + e2e tests
|- .github/workflows/  # CI and publish workflows
`- build.config.ts     # obuild entry matrix
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Public API changes | `src/index.ts` | Main export surface used by package root `.` |
| Add ecosystem support | `src/registries/*.ts` | Implement `Registry`, then register via side-effect import |
| PURL behavior | `src/core/purl.ts` | Validation, normalization, parser/builder |
| HTTP/retry behavior | `src/core/client.ts` | Retry status handling and timeout defaults |
| Cache semantics | `src/cache/lockfile.ts` | TTL + integrity freshness gates |
| CLI command behavior | `src/commands/*.ts`, `src/cli.ts` | Dynamic subcommand loading through citty |
| Test updates | `test/unit/*.test.ts`, `test/e2e/smoke.test.ts` | Unit first; e2e for live registry checks |
| Build/export wiring | `build.config.ts`, `package.json` | Entry points, exports, bin wiring |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `create` | function | `src/core/registry.ts` | high | Registry factory from ecosystem key |
| `createCached` | function | `src/cache/index.ts` | medium | Decorates a registry with cache + lockfile |
| `parsePURL` | function | `src/core/purl.ts` | high | Canonical parser for all PURL input |
| `Client` | class | `src/core/client.ts` | high | Central HTTP behavior, retry, timeout |
| `CachedRegistry` | class | `src/cache/cached-registry.ts` | medium | Cache wrapper implementing `Registry` |
| `main` | constant command | `src/cli.ts` | medium | CLI root with subcommand routing |
| `DEFAULT_TTL` | constant | `src/cache/lockfile.ts` | medium | Project-wide cache freshness policy |

## CONVENTIONS
- ESM-only; TypeScript imports keep `.ts` extension style in source.
- `tsc` is typecheck-only (`noEmit`); build artifacts come from `obuild`.
- Public API is export-barrel-driven; avoid hidden side-channel exports.
- Registries are plugin-like via registration factories, not hardcoded switch logic.
- Tests use Vitest globals with `test/unit` and `test/e2e` split.

## ANTI-PATTERNS (THIS PROJECT)
- Do not parse PURLs outside `src/core/purl.ts`; call `createFromPURL`/`parsePURL`.
- Do not bypass `Client` for direct fetch logic in registries.
- Do not duplicate retry/backoff constants outside `src/core/client.ts`.
- Do not hardcode cache TTL in random modules; use `DEFAULT_TTL` in `src/cache/lockfile.ts`.
- Do not add CommonJS output or `require` paths; package is ESM-first.

## UNIQUE STYLES
- Side-effect ecosystem registration is intentional (`import 'unpux/registries'`).
- `cache` is an optional decorator layer, not mandatory in core flows.
- Bulk fetch helpers intentionally skip failed packages instead of failing all.

## COMMANDS
```bash
pnpm typecheck
pnpm build
pnpm test:run
pnpm test
pnpm release
```

## NOTES
- Release workflow triggers on tags `v*` and publishes with `pnpm publish --no-git-checks`.
- Node runtime floor is `>=22.6.0`; respect modern syntax assumptions.
- Unit tests are broad; e2e smoke tests can be network-sensitive.
