# REGISTRIES GUIDE

## OVERVIEW
`src/registries` contains ecosystem adapters implementing a common `Registry` contract and normalizing foreign API payloads into shared core types.

## STRUCTURE
```text
src/registries/
|- index.ts       # side-effect registration hub
|- npm.ts         # npm adapter
|- pypi.ts        # PyPI adapter
|- cargo.ts       # crates.io adapter
|- rubygems.ts    # RubyGems adapter
`- packagist.ts   # Packagist adapter
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Register all ecosystems | `src/registries/index.ts` | Side-effect import hub |
| npm adapter behavior | `src/registries/npm.ts` | Largest implementation; good pattern baseline |
| Python package behavior | `src/registries/pypi.ts` | Name normalization and metadata mapping |
| Cargo crate behavior | `src/registries/cargo.ts` | crates.io-specific dependency mapping |
| RubyGems behavior | `src/registries/rubygems.ts` | Maintainer/license mapping nuances |
| Packagist behavior | `src/registries/packagist.ts` | Composer ecosystem parsing |

## CONVENTIONS
- Each adapter exposes `ecosystem`, `fetchPackage`, `fetchVersions`, `fetchDependencies`, `fetchMaintainers`, `urls`.
- Convert source-specific fields into core `Package`/`Version`/`Dependency`/`Maintainer` shapes.
- Map remote API failures to core error classes.
- Keep adapter internals self-contained; no adapter-to-adapter imports.

## ANTI-PATTERNS
- Do not call `fetch` directly; use `Client`.
- Do not return raw upstream payloads through public methods.
- Do not skip registration wiring; new adapter must be imported in `index.ts`.

## NOTES
- `npm.ts` is the largest adapter and a reliable local reference for new adapter patterns.
- Keep per-registry quirks isolated to that file; normalize before returning shared types.
