# COMMANDS GUIDE

## OVERVIEW
`src/commands` defines CLI subcommands and shared command utilities on top of core/helpers/cache layers.

## STRUCTURE
```text
src/commands/
|- shared.ts       # shared args, PURL resolver, error wrapper
|- info.ts         # package metadata command
|- versions.ts     # versions list command
|- deps.ts         # dependencies command (versioned)
|- maintainers.ts  # maintainer listing command
`- cache.ts        # cache status/path/clear/prune
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Shared argument flags | `src/commands/shared.ts` | `--json` and `--no-cache` handling |
| PURL input resolution | `src/commands/shared.ts` | Optional `pkg:` prefix normalization |
| `info` output flow | `src/commands/info.ts` | Package metadata command |
| `versions` output flow | `src/commands/versions.ts` | Version list command |
| `deps` output flow | `src/commands/deps.ts` | Version-specific dependency command |
| `maintainers` output flow | `src/commands/maintainers.ts` | Maintainer listing command |
| Cache maintenance commands | `src/commands/cache.ts` | status/path/clear/prune subcommands |

## CONVENTIONS
- Commands are thin orchestration layers; domain logic stays in core/cache/helpers.
- Wrap command bodies with shared error handling helpers.
- Keep output dual-mode (`human` + `--json`).

## ANTI-PATTERNS
- Do not reimplement PURL parsing in individual command files.
- Do not mutate cache internals directly from commands; use cache API.
- Do not bypass shared argument definitions for common flags.

## NOTES
- `src/cli.ts` owns subcommand registration; keep command files focused on execution.
- For new command output, maintain parity between human-readable and `--json` branches.
