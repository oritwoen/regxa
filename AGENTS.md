# regxa

Universal package registry client — ESM-only TypeScript library + CLI. Normalizes package metadata across npm, PyPI, crates.io, RubyGems, and Packagist using PURL-first APIs.

## Quick Commands

```bash
pnpm install              # install dependencies
pnpm dev:prepare          # stub build for development
pnpm build                # production build (obuild → dist/)
pnpm typecheck            # tsc --noEmit
pnpm lint                 # oxlint + oxfmt --check
pnpm fmt                  # oxlint --fix + oxfmt
pnpm test                 # vitest watch mode
pnpm test:run             # vitest single run (CI-style)
pnpm release              # test + build + changelogen --release --push
```

### Run a single test

```bash
pnpm vitest run test/unit/purl.test.ts          # one file
pnpm vitest run -t "should parse valid PURL"    # one test by name
pnpm vitest run test/unit/registries.test.ts -t "npm"  # file + filter
```

## Codebase Map

```text
src/
├── core/            # contracts, PURL parser, client, errors, normalization
├── registries/      # per-ecosystem adapters (npm, pypi, cargo, rubygems, packagist)
├── cache/           # optional decorator: storage, lockfile TTL, integrity
├── commands/        # CLI subcommands (citty)
├── index.ts         # public API barrel
├── helpers.ts       # high-level PURL convenience wrappers
├── ai.ts            # Vercel AI SDK tool integration
├── cli.ts           # executable entrypoint
└── types.ts         # root type re-exports
test/
├── unit/            # deterministic, mocked
└── e2e/             # live HTTP against real registries
```

### Dependency direction

`commands/` and `registries/` depend on `core/`. `cache/` decorates `core/`. Never reverse.

### Where to put new code

| What | Where |
|------|-------|
| New ecosystem adapter | `src/registries/<name>.ts` + import in `src/registries/index.ts` |
| New CLI command | `src/commands/<name>.ts` + wire in `src/cli.ts` |
| Public API addition | export from `src/index.ts` |
| Shared type/contract | `src/core/types.ts` |
| New unit test | `test/unit/<module>.test.ts` |

## Code Conventions

### Imports and modules

- ESM-only (`"type": "module"`). No CommonJS output or `require` paths.
- `.ts` extensions on all source imports — enforced by `verbatimModuleSyntax`.
- Relative paths only, no aliases.
- Barrel exports (`src/index.ts`, `src/core/index.ts`, `src/cache/index.ts`) are the canonical API surfaces.

### Types

- `strict: true` in tsconfig. No `as any`, no `@ts-ignore`, no `@ts-expect-error` workarounds.
- Interfaces for contracts (`Package`, `Version`, `Registry`). Type unions for closed sets (`VersionStatus`, `Scope`).
- `noUnusedLocals: true` — remove dead code, don't comment it out.

### Errors

- Typed error hierarchy from `src/core/errors.ts`: `PkioError` → `HTTPError`, `NotFoundError`, `RateLimitError`, `UnknownEcosystemError`, `InvalidPURLError`.
- Always throw typed errors, never plain `Error`.
- Map remote API failures to the appropriate core error class in adapters.

### HTTP

- All network calls go through `Client` (`src/core/client.ts`). No direct `fetch` or `ofetch` in registries.
- Retry/backoff constants live in `client.ts` only.

### Registries

- Plugin-based via `register()`/`create()` factory. No hardcoded switch logic.
- Side-effect registration is intentional: `import 'regxa/registries'`.
- Each adapter normalizes upstream payloads into core types before returning.
- No adapter-to-adapter imports.

### Tests

- Vitest with globals enabled — `describe`, `it`, `expect`, `vi` used without imports.
- `test/unit/` for deterministic tests with mocks/spies. `test/e2e/` for live HTTP.
- Naming: `*.test.ts`. Structure: `describe("module")` → `it("should ...")`.
- Mocking: `vi.hoisted()` for module mocks, `vi.fn()` for spies.

### Formatting and linting

- `oxlint` (linter) + `oxfmt` (formatter). No eslint, no prettier.
- Run `pnpm fmt` to fix, `pnpm lint` to check.

## Key Symbols

| Symbol | Location | Role |
|--------|----------|------|
| `create` | `src/core/registry.ts` | Registry factory from ecosystem key |
| `createCached` | `src/cache/index.ts` | Decorates registry with cache + lockfile |
| `parsePURL` | `src/core/purl.ts` | Canonical PURL parser — single source of truth |
| `Client` | `src/core/client.ts` | Central HTTP: retry, timeout, rate limiting |
| `DEFAULT_TTL` | `src/cache/lockfile.ts` | Project-wide cache freshness policy |

## Banned Patterns

- Parsing PURLs outside `src/core/purl.ts` — always use `createFromPURL`/`parsePURL`.
- Bypassing `Client` for direct fetch in registries.
- Duplicating retry/backoff constants outside `client.ts`.
- Hardcoding cache TTL outside `lockfile.ts`.
- Adding CommonJS output or `require` paths.
- Using `as any`, `@ts-ignore`, or suppressing type errors.

## Execution Workflow

1. **Explore** — read relevant code before making changes. Understand the module boundaries.
2. **Plan** — for non-trivial changes, outline the approach. Check if types.ts changes cascade.
3. **Edit** — make focused changes. Keep diffs minimal.
4. **Verify** — run the cycle:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test:run
   ```
   Fix issues before considering the work done.

## Safety and Git

- Do not commit unless explicitly asked.
- Do not push, force-push, or delete branches without explicit approval.
- Do not commit `.env`, credentials, or secrets.
- Prefer `git add <specific files>` over `git add -A`.
- New commits over amending — especially after hook failures.

## Project Notes

- Node floor: `>=22.6.0` — modern syntax is expected.
- Build: `obuild` (not tsc). `tsc` is typecheck-only (`noEmit`).
- Release: tags `v*` trigger publish workflow with `pnpm publish --no-git-checks`.
- Bulk fetch helpers skip failed packages instead of failing all — this is intentional.
- Cache is optional decorator, never mandatory in core flows.
- e2e smoke tests are network-sensitive — failures may be transient.
