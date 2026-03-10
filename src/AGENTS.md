# SOURCE GUIDE

## OVERVIEW

`src/` is the implementation boundary: core contracts, ecosystem adapters, cache decorator, CLI commands, and top-level export barrels.

## STRUCTURE

```text
src/
|- core/        # primitives and shared contracts
|- registries/  # ecosystem implementations
|- cache/       # storage + freshness metadata
|- commands/    # CLI command handlers
|- index.ts     # package public API barrel
|- helpers.ts   # high-level PURL helpers
|- cli.ts       # executable command root
`- types.ts     # root type re-exports
```

## WHERE TO LOOK

| Task                  | Location                           | Notes                                                            |
| --------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Extend public exports | `src/index.ts`                     | Keep grouping order stable (Core, Errors, Helpers, Types, Cache) |
| Add convenience API   | `src/helpers.ts`                   | Wrap `createFromPURL`; preserve normalization path               |
| Add CLI command       | `src/commands/*.ts` + `src/cli.ts` | Command file + dynamic import wiring                             |
| Add ecosystem adapter | `src/registries/*.ts`              | Register through factory + side-effect import hub                |
| Change shared models  | `src/core/types.ts`                | Impacts all registries and helpers                               |

## CONVENTIONS

- Direction is inward: commands/registries/cache depend on `core`, not the reverse.
- Use `.ts` import suffixes consistently.
- Keep barrels (`src/index.ts`, `src/core/index.ts`, `src/cache/index.ts`) as canonical export surfaces.

## ANTI-PATTERNS

- Do not duplicate parsing logic in commands/helpers; route through `createFromPURL`.
- Do not implement fetch/retry behavior outside `src/core/client.ts`.
- Do not make cache mandatory for base registry usage.
